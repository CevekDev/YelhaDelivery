-- =====================================================================
-- Yelha Delivery — Données de seed (développement local uniquement)
-- =====================================================================
-- ATTENTION : ce script ne crée PAS de comptes auth.users.
-- Pour créer le compte admin :
--   1. Va dans Supabase Dashboard → Authentication → Users → Add user
--   2. Crée un utilisateur avec ADMIN_EMAIL / ADMIN_PASSWORD (.env)
--   3. Récupère son UUID et exécute :
--        insert into public.profiles (id, role, full_name)
--        values ('<UUID>', 'admin', 'Super Admin');
-- =====================================================================

-- Exemple de restaurant pour tester la page publique (sans owner)
insert into public.restaurants (
  name, slug, description, address, city, phone,
  is_open, accept_orders, delivery_fee, min_order, estimated_delivery_time, status
) values (
  'El Bahia',
  'el-bahia-alger',
  'Cuisine algérienne traditionnelle, plats du jour préparés à la commande.',
  '12 rue Didouche Mourad',
  'Alger',
  '0555123456',
  true, true, 200, 800, 35, 'active'
) on conflict (slug) do nothing;

-- Catégories + plats de démo
do $$
declare
  rest_id uuid;
  cat_entree uuid;
  cat_plat uuid;
begin
  select id into rest_id from public.restaurants where slug = 'el-bahia-alger';
  if rest_id is null then return; end if;

  -- Évite les doublons au re-run
  if exists (select 1 from public.menu_categories where restaurant_id = rest_id) then return; end if;

  insert into public.menu_categories (restaurant_id, name, sort_order) values (rest_id, 'Entrées', 1) returning id into cat_entree;
  insert into public.menu_categories (restaurant_id, name, sort_order) values (rest_id, 'Plats', 2) returning id into cat_plat;
  insert into public.menu_categories (restaurant_id, name, sort_order) values (rest_id, 'Desserts', 3);

  insert into public.menu_items (restaurant_id, category_id, name, description, price, sort_order) values
    (rest_id, cat_entree, 'Chorba frik', 'Soupe traditionnelle au blé concassé et agneau.', 350, 1),
    (rest_id, cat_entree, 'Bourek viande', 'Feuilles de brick farcies à la viande hachée et œuf.', 250, 2),
    (rest_id, cat_plat, 'Couscous royal', 'Couscous semoule fine, légumes et viandes variées.', 1200, 1),
    (rest_id, cat_plat, 'Tajine zitoune', 'Poulet aux olives, sauce blanche, citron confit.', 950, 2),
    (rest_id, cat_plat, 'Mhadjeb', 'Crêpes farcies aux légumes épicés.', 400, 3);
end $$;
