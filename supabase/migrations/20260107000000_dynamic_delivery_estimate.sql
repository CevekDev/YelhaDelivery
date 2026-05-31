-- =====================================================================
-- Temps de livraison dynamique
-- - delivered_at : timestamp précis de livraison (set par trigger)
-- - orders.estimated_delivery_time : snapshot au moment de la commande
-- - get_delivery_estimate(restaurant_id) : moyenne glissante des 20
--   dernières livraisons des 30 derniers jours, combinée au baseline.
-- =====================================================================

alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists estimated_delivery_time int;

-- Backfill : pour les commandes existantes sans snapshot, copier la valeur
-- actuelle du restaurant. Pour les commandes déjà livrées, on utilise updated_at
-- comme approximation de delivered_at.
update public.orders o
set estimated_delivery_time = r.estimated_delivery_time
from public.restaurants r
where o.restaurant_id = r.id and o.estimated_delivery_time is null;

update public.orders
set delivered_at = updated_at
where status = 'delivered' and delivered_at is null;

-- Trigger : capture delivered_at automatiquement
create or replace function public.tg_set_delivered_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'delivered' and (old.status is null or old.status <> 'delivered')
     and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivered_at on public.orders;
create trigger orders_set_delivered_at
  before update on public.orders
  for each row
  execute function public.tg_set_delivered_at();

-- =====================================================================
-- get_delivery_estimate : estimation dynamique (en minutes, entier)
--
-- Algorithme :
--   1. Récupère le baseline du restaurant (estimated_delivery_time)
--   2. Calcule la moyenne réelle des 20 dernières livraisons des 30 derniers
--      jours, en clippant chaque durée individuelle à [5 min, baseline×3]
--      (anti-outliers : commande oubliée, livreur qui n'a pas tapé "Livré"
--      pendant 4 h, etc.)
--   3. Si < 5 livraisons valides → renvoie le baseline (pas assez de data)
--   4. Sinon : 30% baseline + 70% moyenne, clampé à [baseline/2, baseline×2]
-- =====================================================================
create or replace function public.get_delivery_estimate(p_restaurant_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_baseline int;
  v_max_minutes int;
  v_count int;
  v_avg numeric;
  v_smoothed numeric;
begin
  select estimated_delivery_time into v_baseline
  from restaurants where id = p_restaurant_id;
  if v_baseline is null then return 30; end if;

  v_max_minutes := v_baseline * 3;

  select
    count(*),
    avg(least(greatest(extract(epoch from (delivered_at - created_at)) / 60, 5), v_max_minutes))
  into v_count, v_avg
  from orders
  where restaurant_id = p_restaurant_id
    and status = 'delivered'
    and delivered_at is not null
    and created_at > now() - interval '30 days';

  if v_count < 5 then
    return v_baseline;
  end if;

  v_smoothed := v_baseline * 0.3 + v_avg * 0.7;
  return greatest(v_baseline / 2, least(v_baseline * 2, round(v_smoothed)))::int;
end;
$$;

grant execute on function public.get_delivery_estimate(uuid) to anon, authenticated;

-- =====================================================================
-- Update place_order : snapshotte le temps de livraison au moment de la commande
-- =====================================================================
create or replace function public.place_order(
  p_restaurant_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text,
  p_items jsonb,
  p_promo_code text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant restaurants%rowtype;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount numeric := 0;
  v_applied_code text := null;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_menu_item menu_items%rowtype;
  v_unit_price numeric;
  v_qty int;
  v_line_subtotal numeric;
  v_items_count int;
  v_promo promo_codes%rowtype;
  v_eta int;
begin
  if p_customer_name is null or char_length(trim(p_customer_name)) < 2 then
    raise exception 'Nom invalide';
  end if;
  if p_customer_phone !~ '^0[5-7][0-9]{8}$' then
    raise exception 'Téléphone invalide';
  end if;
  if p_customer_address is null or char_length(trim(p_customer_address)) < 5 then
    raise exception 'Adresse invalide';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Items invalides';
  end if;
  select count(*) into v_items_count from jsonb_array_elements(p_items);
  if v_items_count = 0 or v_items_count > 50 then
    raise exception 'Nombre d''articles invalide';
  end if;

  select * into v_restaurant
  from restaurants
  where slug = p_restaurant_slug
    and status = 'active'
    and is_open = true
    and accept_orders = true
  limit 1;
  if v_restaurant.id is null then
    raise exception 'Restaurant indisponible';
  end if;

  if not public.is_within_hours(v_restaurant.id) then
    raise exception 'Restaurant fermé en ce moment';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'Quantité invalide';
    end if;
    select * into v_menu_item
    from menu_items
    where id = (v_item->>'menu_item_id')::uuid
      and restaurant_id = v_restaurant.id
      and is_available = true
    limit 1;
    if v_menu_item.id is null then
      raise exception 'Plat indisponible';
    end if;
    v_unit_price := coalesce(v_menu_item.promo_price, v_menu_item.price);
    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  end loop;

  if v_subtotal < v_restaurant.min_order then
    raise exception 'Montant minimum non atteint';
  end if;

  if p_promo_code is not null and char_length(trim(p_promo_code)) > 0 then
    select * into v_promo from promo_codes
      where restaurant_id = v_restaurant.id and code = upper(trim(p_promo_code))
      limit 1;
    if v_promo.id is null or not v_promo.is_active then
      raise exception 'Code promo invalide';
    end if;
    if v_promo.expires_at is not null and v_promo.expires_at < now() then
      raise exception 'Code promo expiré';
    end if;
    if v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then
      raise exception 'Code promo épuisé';
    end if;
    if v_subtotal < v_promo.min_order then
      raise exception 'Commande minimum non atteinte pour ce code';
    end if;
    if v_promo.discount_type = 'percent' then
      v_discount := round((v_subtotal * v_promo.discount_value / 100)::numeric, 2);
    else
      v_discount := least(v_promo.discount_value, v_subtotal);
    end if;
    v_applied_code := v_promo.code;
    update promo_codes set used_count = used_count + 1 where id = v_promo.id;
  end if;

  if v_restaurant.free_delivery_above is not null
     and v_subtotal >= v_restaurant.free_delivery_above then
    v_delivery_fee := 0;
  else
    v_delivery_fee := v_restaurant.delivery_fee;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_delivery_fee;

  -- ETA dynamique snapshotté
  v_eta := public.get_delivery_estimate(v_restaurant.id);

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, total, status, promo_code, discount_amount,
    estimated_delivery_time
  ) values (
    v_restaurant.id,
    trim(p_customer_name),
    p_customer_phone,
    trim(p_customer_address),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_subtotal,
    v_delivery_fee,
    v_total,
    'pending',
    v_applied_code,
    v_discount,
    v_eta
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_menu_item
    from menu_items
    where id = (v_item->>'menu_item_id')::uuid
      and restaurant_id = v_restaurant.id;
    v_unit_price := coalesce(v_menu_item.promo_price, v_menu_item.price);
    v_line_subtotal := v_unit_price * v_qty;
    insert into order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
    values (v_order_id, v_menu_item.id, v_menu_item.name, v_unit_price, v_qty, v_line_subtotal);
  end loop;

  insert into notifications (restaurant_id, user_id, title, body, type)
  select v_restaurant.id, v_restaurant.owner_id,
         'Nouvelle commande ' || v_order_number,
         trim(p_customer_name) || ' — ' || v_total || ' DZD',
         'new_order';

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.place_order(text, text, text, text, text, jsonb, text) to anon, authenticated;

-- =====================================================================
-- Update get_public_order : utilise le snapshot de la commande
-- =====================================================================
drop function if exists public.get_public_order(uuid);

create function public.get_public_order(p_id uuid)
returns table (
  id uuid,
  order_number text,
  restaurant_id uuid,
  restaurant_slug text,
  restaurant_name text,
  status text,
  customer_name text,
  customer_phone text,
  customer_address text,
  subtotal numeric,
  delivery_fee numeric,
  discount_amount numeric,
  promo_code text,
  total numeric,
  created_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_time int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.order_number,
    o.restaurant_id,
    r.slug as restaurant_slug,
    r.name as restaurant_name,
    o.status,
    o.customer_name,
    o.customer_phone,
    o.customer_address,
    o.subtotal,
    o.delivery_fee,
    o.discount_amount,
    o.promo_code,
    o.total,
    o.created_at,
    o.delivered_at,
    coalesce(o.estimated_delivery_time, r.estimated_delivery_time)
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.id = p_id
$$;

grant execute on function public.get_public_order(uuid) to anon, authenticated;
