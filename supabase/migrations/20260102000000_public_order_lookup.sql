-- =====================================================================
-- RPC publique : get_public_order(p_id uuid)
-- Permet à un client anonyme de récupérer SA commande pour la page de suivi.
-- Renvoie uniquement les champs nécessaires (pas de driver_id, pas de notes
-- restaurateur internes éventuelles).
-- =====================================================================

create or replace function public.get_public_order(p_id uuid)
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
  total numeric,
  created_at timestamptz,
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
    o.total,
    o.created_at,
    r.estimated_delivery_time
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.id = p_id
$$;

grant execute on function public.get_public_order(uuid) to anon, authenticated;

-- Items publics aussi (pour afficher le récap)
create or replace function public.get_public_order_items(p_order_id uuid)
returns table (
  id uuid,
  item_name text,
  item_price numeric,
  quantity int,
  subtotal numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select id, item_name, item_price, quantity, subtotal
  from public.order_items
  where order_id = p_order_id
$$;

grant execute on function public.get_public_order_items(uuid) to anon, authenticated;

-- =====================================================================
-- RPC publique : place_order
-- Crée une commande + ses items en une seule transaction. Recalcule TOUT
-- côté serveur depuis menu_items (jamais confiance aux prix envoyés par le client).
-- =====================================================================

create or replace function public.place_order(
  p_restaurant_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text,
  p_items jsonb  -- [{menu_item_id: uuid, quantity: int}, ...]
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
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_menu_item menu_items%rowtype;
  v_qty int;
  v_line_subtotal numeric;
  v_items_count int;
begin
  -- Validation basique des entrées
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

  -- Restaurant ouvert et acceptant les commandes
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

  -- Calcul du subtotal en lisant les prix réels
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
    v_subtotal := v_subtotal + (v_menu_item.price * v_qty);
  end loop;

  -- Min commande
  if v_subtotal < v_restaurant.min_order then
    raise exception 'Montant minimum non atteint';
  end if;

  v_total := v_subtotal + v_restaurant.delivery_fee;

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
    v_restaurant.delivery_fee,
    v_total,
    'pending'
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  -- Insère les items (snapshot)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_menu_item
    from menu_items
    where id = (v_item->>'menu_item_id')::uuid
      and restaurant_id = v_restaurant.id;
    v_line_subtotal := v_menu_item.price * v_qty;
    insert into order_items (order_id, menu_item_id, item_name, item_price, quantity, subtotal)
    values (v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.price, v_qty, v_line_subtotal);
  end loop;

  -- Notification pour le restaurateur
  insert into notifications (restaurant_id, user_id, title, body, type)
  select v_restaurant.id, v_restaurant.owner_id,
         'Nouvelle commande ' || v_order_number,
         trim(p_customer_name) || ' — ' || v_total || ' DZD',
         'new_order';

  return query select v_order_id, v_order_number;
end;
$$;

grant execute on function public.place_order(text, text, text, text, text, jsonb) to anon, authenticated;
