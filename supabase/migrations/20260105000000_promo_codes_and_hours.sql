-- =====================================================================
-- Codes promo + horaires d'ouverture
-- =====================================================================

-- =====================================================================
-- Table : promo_codes
-- =====================================================================
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{3,30}$'),  -- toujours stocké en MAJ
  discount_type text not null check (discount_type in ('percent', 'fixed_amount')),
  -- pour percent : 1..100 ; pour fixed_amount : montant en DA
  discount_value numeric(10,2) not null
    check (discount_value > 0 and discount_value <= 1000000),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, code)
);
create index if not exists promo_codes_restaurant_idx on public.promo_codes(restaurant_id);

-- Contrainte logique : si discount_type=percent alors value <= 100
alter table public.promo_codes
  drop constraint if exists promo_codes_percent_max;
alter table public.promo_codes
  add constraint promo_codes_percent_max
  check (discount_type <> 'percent' or discount_value <= 100);

-- Trigger : maintenir updated_at (pas besoin ici, table simple)

-- RLS
alter table public.promo_codes enable row level security;

drop policy if exists promo_codes_owner_all on public.promo_codes;
create policy promo_codes_owner_all on public.promo_codes
  for all using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  ) with check (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- Pas de SELECT pour les autres rôles : la validation au checkout passe par
-- une RPC SECURITY DEFINER qui révèle uniquement le minimum nécessaire.

-- =====================================================================
-- Table : opening_hours (1 ligne par jour de la semaine par restaurant)
-- day_of_week : 1 = Lundi, 2 = Mardi, ..., 7 = Dimanche (norme ISO)
-- Pour gérer les coupures (ex: 11-15h + 19-23h), on autorise plusieurs lignes
-- par jour. Pas de unique sur (restaurant_id, day_of_week).
-- =====================================================================
create table if not exists public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  check (opens_at < closes_at)  -- pas de service traversant minuit pour l'instant
);
create index if not exists opening_hours_restaurant_idx on public.opening_hours(restaurant_id, day_of_week);

alter table public.opening_hours enable row level security;

drop policy if exists opening_hours_select_public on public.opening_hours;
create policy opening_hours_select_public on public.opening_hours
  for select using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active')
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists opening_hours_owner_write on public.opening_hours;
create policy opening_hours_owner_write on public.opening_hours
  for all using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  ) with check (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- =====================================================================
-- Colonnes promo + discount sur orders
-- =====================================================================
alter table public.orders
  add column if not exists promo_code text,
  add column if not exists discount_amount numeric(10,2) not null default 0
    check (discount_amount >= 0);

-- =====================================================================
-- Helper : est-on dans les horaires d'ouverture maintenant ?
-- Utilise le fuseau horaire Africa/Algiers (UTC+1, pas de DST).
-- Renvoie true si :
--   - aucune ligne d'horaires définie pour ce restaurant (= toujours ouvert),
--   - OU il existe une plage horaires couvrant l'instant présent.
-- =====================================================================
create or replace function public.is_within_hours(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with local_now as (
    select
      timezone('Africa/Algiers', now()) as ts
  ),
  parts as (
    select
      -- ISO day of week : 1 = Lundi, 7 = Dimanche
      extract(isodow from ts)::int as dow,
      ts::time as t
    from local_now
  ),
  any_schedule as (
    select count(*) as n from opening_hours where restaurant_id = p_restaurant_id
  )
  select case
    when (select n from any_schedule) = 0 then true
    else exists (
      select 1
      from opening_hours h, parts p
      where h.restaurant_id = p_restaurant_id
        and h.day_of_week = p.dow
        and h.is_closed = false
        and p.t >= h.opens_at
        and p.t < h.closes_at
    )
  end;
$$;

grant execute on function public.is_within_hours(uuid) to anon, authenticated;

-- =====================================================================
-- RPC : validate_promo_code (appelée au checkout pour preview)
-- =====================================================================
create or replace function public.validate_promo_code(
  p_restaurant_slug text,
  p_code text,
  p_subtotal numeric
)
returns table (
  ok boolean,
  reason text,
  discount_type text,
  discount_value numeric,
  discount_amount numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_promo promo_codes%rowtype;
  v_code_upper text := upper(trim(p_code));
  v_amount numeric;
begin
  select id into v_restaurant_id from restaurants where slug = p_restaurant_slug and status = 'active';
  if v_restaurant_id is null then
    return query select false, 'Restaurant indisponible', null::text, null::numeric, 0::numeric;
    return;
  end if;

  select * into v_promo from promo_codes
    where restaurant_id = v_restaurant_id and code = v_code_upper limit 1;

  if v_promo.id is null then
    return query select false, 'Code promo invalide', null::text, null::numeric, 0::numeric;
    return;
  end if;
  if not v_promo.is_active then
    return query select false, 'Code promo désactivé', null::text, null::numeric, 0::numeric;
    return;
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return query select false, 'Code promo expiré', null::text, null::numeric, 0::numeric;
    return;
  end if;
  if v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then
    return query select false, 'Code promo épuisé', null::text, null::numeric, 0::numeric;
    return;
  end if;
  if p_subtotal < v_promo.min_order then
    return query select false,
      'Commande minimum ' || v_promo.min_order || ' DA pour ce code',
      null::text, null::numeric, 0::numeric;
    return;
  end if;

  if v_promo.discount_type = 'percent' then
    v_amount := round((p_subtotal * v_promo.discount_value / 100)::numeric, 2);
  else
    v_amount := least(v_promo.discount_value, p_subtotal);
  end if;

  return query select true, 'OK'::text, v_promo.discount_type, v_promo.discount_value, v_amount;
end;
$$;

grant execute on function public.validate_promo_code(text, text, numeric) to anon, authenticated;

-- =====================================================================
-- Update RPC place_order : applique le code promo + bloque hors horaires
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

  -- Vérifier les horaires d'ouverture
  if not public.is_within_hours(v_restaurant.id) then
    raise exception 'Restaurant fermé en ce moment';
  end if;

  -- Calcul subtotal
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

  -- Validation et application du code promo
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
    -- Incrémente le compteur d'usage
    update promo_codes set used_count = used_count + 1 where id = v_promo.id;
  end if;

  -- Livraison gratuite au-delà du seuil (basée sur subtotal AVANT remise)
  if v_restaurant.free_delivery_above is not null
     and v_subtotal >= v_restaurant.free_delivery_above then
    v_delivery_fee := 0;
  else
    v_delivery_fee := v_restaurant.delivery_fee;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_delivery_fee;

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, total, status, promo_code, discount_amount
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
    v_discount
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
