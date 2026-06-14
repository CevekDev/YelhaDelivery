-- =====================================================================
-- YelhaDelivery — Données de démo (restaurant vitrine « El Bahia »)
-- =====================================================================
-- ATTENTION : ce script ne crée PAS de comptes auth.users.
-- Pour créer le compte admin :
--   1. Supabase Dashboard → Authentication → Users → Add user
--      (avec ADMIN_EMAIL / ADMIN_PASSWORD du .env)
--   2. Récupère son UUID et exécute :
--        insert into public.profiles (id, role, full_name)
--        values ('<UUID>', 'admin', 'Super Admin');
--
-- Sûr et idempotent :
--   • le restaurant est créé OU mis à jour (on conflict do update) afin que
--     re-jouer le script rafraîchisse le template + le contenu vitrine ;
--   • la carte (catégories/plats/variantes/extras) n'est insérée qu'une fois
--     (garde anti-doublon). Pour la régénérer, supprime d'abord les catégories
--     du resto démo puis relance.
--
-- Note : les PHOTOS doivent être ajoutées depuis le dashboard (upload R2).
-- Le démo est conçu pour être impeccable même sans images (les sections
-- visuelles sans photo s'effacent automatiquement, le texte reste mis en page).
-- =====================================================================

-- ── Restaurant vitrine ───────────────────────────────────────────────
-- Template 6 = « Riad » (oriental & généreux), idéal cuisine algérienne.
insert into public.restaurants (
  name, slug, description, address, city, phone,
  is_open, accept_orders, delivery_fee, min_order, estimated_delivery_time,
  status, template_id, home_enabled, site_config
) values (
  'El Bahia',
  'el-bahia-alger',
  $t$Cuisine algérienne traditionnelle, plats du jour préparés à la commande.$t$,
  '12 rue Didouche Mourad',
  'Alger',
  '0555123456',
  true, true, 200, 800, 35,
  'active', 6, true,
  $json$
  {
    "hero_title": "El Bahia — la table d'Alger",
    "hero_subtitle": "Cuisine algérienne traditionnelle, préparée chaque jour à la commande et livrée bien chaude chez vous.",
    "hero_cta": "Découvrir la carte",
    "about_title": "Une cuisine de famille, au cœur d'Alger",
    "about_text": "Depuis le quartier de Didouche Mourad, El Bahia perpétue les recettes transmises de génération en génération. Couscous roulé à la main, tajines mijotés des heures, pâtisseries au miel : chaque plat est cuisiné à la commande, avec des produits frais du marché.\n\nNotre promesse : la générosité d'une vraie table algérienne, livrée chez vous sans rien perdre de sa saveur.",
    "highlights": [
      { "title": "Fait maison chaque jour", "text": "Semoule roulée à la main, sauces mijotées longuement, rien d'industriel." },
      { "title": "Produits du marché", "text": "Viandes et légumes choisis frais le matin même." },
      { "title": "Livraison chaude & rapide", "text": "Emballage isotherme : vos plats arrivent à bonne température." }
    ],
    "contact_intro": "Une question, une commande spéciale ? Écrivez-nous, on répond vite.",
    "facebook": "https://facebook.com/elbahiaalger",
    "instagram": "https://instagram.com/elbahiaalger"
  }
  $json$::jsonb
)
on conflict (slug) do update set
  description  = excluded.description,
  template_id  = excluded.template_id,
  home_enabled = excluded.home_enabled,
  site_config  = excluded.site_config,
  status       = excluded.status;

-- ── Carte de démo (catégories, plats, variantes, extras) ─────────────
do $$
declare
  rest_id      uuid;
  cat_entree   uuid;
  cat_plat     uuid;
  cat_dessert  uuid;
  it_couscous  uuid;
  it_tajine    uuid;
  it_mhadjeb   uuid;
  ex_harissa   uuid;
  ex_pain      uuid;
  ex_olives    uuid;
begin
  select id into rest_id from public.restaurants where slug = 'el-bahia-alger';
  if rest_id is null then return; end if;

  -- Anti-doublon : ne ré-insère pas la carte si elle existe déjà.
  if exists (select 1 from public.menu_categories where restaurant_id = rest_id) then
    return;
  end if;

  -- Catégories
  insert into public.menu_categories (restaurant_id, name, sort_order)
    values (rest_id, 'Entrées', 1) returning id into cat_entree;
  insert into public.menu_categories (restaurant_id, name, sort_order)
    values (rest_id, 'Plats', 2) returning id into cat_plat;
  insert into public.menu_categories (restaurant_id, name, sort_order)
    values (rest_id, 'Desserts', 3) returning id into cat_dessert;

  -- Entrées
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
    (rest_id, cat_entree, 'Chorba frik',     $t$Soupe traditionnelle au blé concassé, agneau et coriandre fraîche.$t$, 350, 'dish', 1),
    (rest_id, cat_entree, 'Bourek viande',   $t$Feuilles de brick croustillantes farcies à la viande hachée et à l'œuf.$t$, 250, 'dish', 2),
    (rest_id, cat_entree, 'Salade méchouia', $t$Poivrons et tomates grillés, ail et huile d'olive.$t$, 300, 'dish', 3);

  -- Plats (on capture les id qui reçoivent variantes / extras)
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order)
    values (rest_id, cat_plat, 'Couscous royal', $t$Semoule fine roulée à la main, bouillon de légumes, agneau, poulet et merguez.$t$, 1200, 'dish', 1)
    returning id into it_couscous;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order)
    values (rest_id, cat_plat, 'Tajine zitoune', $t$Poulet fermier aux olives, sauce blanche citronnée.$t$, 950, 'dish', 2)
    returning id into it_tajine;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order)
    values (rest_id, cat_plat, 'Mhadjeb', $t$Crêpes feuilletées farcies aux légumes épicés (tomate, oignon, poivron).$t$, 400, 'dish', 3)
    returning id into it_mhadjeb;
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
    (rest_id, cat_plat, 'Rechta', $t$Nouilles fraîches faites maison, sauce blanche au poulet et pois chiches.$t$, 1000, 'dish', 4);

  -- Offre du midi (item_type = 'offer' + badge + prix promo)
  insert into public.menu_items
    (restaurant_id, category_id, name, description, price, promo_price, item_type, offer_badge, offer_description, sort_order)
  values
    (rest_id, cat_plat, 'Formule déjeuner',
     $t$Entrée + plat du jour + dessert. Disponible tous les midis.$t$,
     1500, 1100, 'offer', '-25%', $t$Entrée + plat + dessert$t$, 5);

  -- Desserts
  insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
    (rest_id, cat_dessert, 'Kalb el louz', $t$Gâteau de semoule à l'amande, imbibé de sirop parfumé à la fleur d'oranger.$t$, 200, 'dish', 1),
    (rest_id, cat_dessert, 'Makroud',      $t$Losanges de semoule fourrés aux dattes, frits et nappés de miel.$t$, 180, 'dish', 2);

  -- Extras / suppléments (is_extra = true → n'apparaissent pas comme plats,
  -- seulement en options lorsqu'ils sont liés à un plat)
  insert into public.menu_items (restaurant_id, name, description, price, item_type, is_extra, sort_order)
    values (rest_id, 'Sauce harissa', $t$Piment maison relevé, à doser selon votre goût.$t$, 50, 'sauce', true, 1)
    returning id into ex_harissa;
  insert into public.menu_items (restaurant_id, name, description, price, item_type, is_extra, sort_order)
    values (rest_id, 'Pain maison (kesra)', $t$Galette de semoule cuite au four.$t$, 30, 'supplement', true, 2)
    returning id into ex_pain;
  insert into public.menu_items (restaurant_id, name, description, price, item_type, is_extra, sort_order)
    values (rest_id, 'Olives & citron confit', $t$Petit accompagnement maison.$t$, 60, 'supplement', true, 3)
    returning id into ex_olives;

  -- Variantes du couscous (tailles)
  insert into public.menu_item_variants (menu_item_id, name, price, sort_order) values
    (it_couscous, 'Portion simple', 900, 1),
    (it_couscous, 'Portion royale', 1400, 2);

  -- Extras liés (is_free = true → offert)
  insert into public.menu_item_extras (menu_item_id, extra_item_id, sort_order, is_free) values
    (it_couscous, ex_harissa, 1, true),
    (it_couscous, ex_pain,    2, false),
    (it_tajine,   ex_pain,    1, false),
    (it_mhadjeb,  ex_harissa, 1, true),
    (it_mhadjeb,  ex_olives,  2, false);
end $$;
