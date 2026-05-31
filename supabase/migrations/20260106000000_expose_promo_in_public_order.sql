-- Étend get_public_order pour exposer le code promo et le montant de réduction.
-- DROP nécessaire car la signature de retour (TABLE) change.

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
    r.estimated_delivery_time
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.id = p_id
$$;

grant execute on function public.get_public_order(uuid) to anon, authenticated;

-- Marque la migration ratée précédemment comme appliquée (clean up tracking)
delete from public._migrations where filename = '20260106000000_expose_promo_in_public_order.sql';
