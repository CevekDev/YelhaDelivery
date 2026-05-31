-- =====================================================================
-- Migration : bannière restaurant + prix promo par plat + suppléments
-- + livraison gratuite au-delà d'un montant.
-- =====================================================================

-- 1. Bannière + seuil livraison gratuite sur restaurants
alter table public.restaurants
  add column if not exists banner_text text
    check (banner_text is null or char_length(banner_text) <= 200),
  add column if not exists banner_image_url text,
  add column if not exists free_delivery_above numeric(10,2)
    check (free_delivery_above is null or free_delivery_above >= 0);

-- 2. Prix promo + flag "supplément" sur les plats
alter table public.menu_items
  add column if not exists promo_price numeric(10,2),
  add column if not exists is_extra boolean not null default false;

-- Contrainte : promo_price valide (positif, strictement inférieur au prix normal)
-- On supprime puis recrée pour gérer la ré-exécution.
alter table public.menu_items
  drop constraint if exists menu_items_promo_price_check;
alter table public.menu_items
  add constraint menu_items_promo_price_check
  check (promo_price is null or (promo_price >= 0 and promo_price < price));

-- =====================================================================
-- Update place_order RPC : applique le prix promo + livraison gratuite
-- =====================================================================
create or replace function public.place_order(
  p_restaurant_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text,
  p_items jsonb
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
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_menu_item menu_items%rowtype;
  v_unit_price numeric;
  v_qty int;
  v_line_subtotal numeric;
  v_items_count int;
begin
  -- Validations basiques
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

  -- Restaurant ouvert
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

  -- Calcul subtotal avec PRIX PROMO si défini
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

  -- Min commande
  if v_subtotal < v_restaurant.min_order then
    raise exception 'Montant minimum non atteint';
  end if;

  -- Livraison gratuite au-delà du seuil
  if v_restaurant.free_delivery_above is not null
     and v_subtotal >= v_restaurant.free_delivery_above then
    v_delivery_fee := 0;
  else
    v_delivery_fee := v_restaurant.delivery_fee;
  end if;

  v_total := v_subtotal + v_delivery_fee;

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    notes, subtotal, delivery_fee, total, status
  ) values (
    v_restaurant.id,
    trim(p_customer_name),
    p_customer_phone,
    trim(p_customer_address),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_subtotal,
    v_delivery_fee,
    v_total,
    'pending'
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  -- Insère les items avec le prix appliqué (snapshot du prix promo si actif)
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
