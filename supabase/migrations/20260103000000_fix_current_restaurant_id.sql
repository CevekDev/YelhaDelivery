-- =====================================================================
-- Fix : current_restaurant_id() ne renvoyait rien pour les restaurateurs.
--
-- L'ancienne version lisait seulement profiles.restaurant_id, qui n'est
-- renseigné que pour les LIVREURS. Les RESTAURATEURS sont liés à leur
-- restaurant via restaurants.owner_id, donc la fonction renvoyait NULL,
-- ce qui faisait échouer la policy de Storage `restaurant-images owner
-- write` (ERR new row violates row-level security policy).
--
-- Nouvelle version : on essaie d'abord côté propriétaire (restaurateur),
-- puis on retombe sur profiles.restaurant_id (livreur).
-- =====================================================================

create or replace function public.current_restaurant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select id from public.restaurants where owner_id = auth.uid() limit 1),
    (select restaurant_id from public.profiles where id = auth.uid())
  );
$$;
