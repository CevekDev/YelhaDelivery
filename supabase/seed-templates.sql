-- =====================================================================
-- YelhaDelivery — Restaurants démo « vitrine des templates »
-- Un restaurant par template (1,2,3,4,5,7). Le template 6 (Riad) est déjà
-- couvert par El Bahia (seed.sql).
-- Idempotent : restaurants en upsert (rafraîchit la vitrine au re-run),
-- menus protégés par garde anti-doublon. Pas de photos (CSP limite aux
-- images Supabase/R2) → les templates s'affichent avec leurs placeholders.
-- =====================================================================

insert into public.restaurants
  (name, slug, description, address, city, phone, is_open, accept_orders,
   delivery_fee, min_order, estimated_delivery_time, status, template_id, home_enabled, site_config)
values
-- ── 1. Saveur (split) — fast-food / burgers ──────────────────────────
('Saveur Burger', 'demo-saveur',
 $t$Burgers smashés, frites maison et sauces signature. Rapide et généreux.$t$,
 '8 boulevard Mohamed V', 'Oran', '0560111111', true, true, 150, 600, 25, 'active', 1, true,
 $json$ {
   "hero_title": "Le smash burger comme à la maison",
   "hero_subtitle": "Pain brioché, steak smashé minute, cheddar fondant. Vous commandez, on s'occupe du reste.",
   "hero_cta": "Commander un burger",
   "about_title": "Le goût du fait-minute",
   "about_text": "Chez Saveur, tout est préparé à la commande : steaks smashés sur la plancha, frites coupées le matin même, sauces maison. Pas de surgelé, pas d'attente interminable — juste un bon burger, livré chaud.",
   "highlights": [
     { "title": "Fait minute", "text": "Chaque burger est cuit à la commande, jamais à l'avance." },
     { "title": "Frites maison", "text": "Pommes de terre fraîches, coupées et frites sur place." },
     { "title": "Livraison express", "text": "Chaud chez vous en 25 minutes en moyenne." }
   ],
   "contact_intro": "Une envie de burger ? On est là."
 } $json$::jsonb),

-- ── 2. Trattoria (centered) — italien ────────────────────────────────
('Bella Trattoria', 'demo-trattoria',
 $t$Pâtes fraîches et pizzas napolitaines, dans la pure tradition italienne.$t$,
 '15 rue Larbi Ben M''hidi', 'Alger', '0560222222', true, true, 200, 800, 35, 'active', 2, true,
 $json$ {
   "hero_title": "La dolce vita à votre table",
   "hero_subtitle": "Pâtes fraîches faites maison et pizzas cuites au feu de bois, comme en Italie.",
   "hero_cta": "Voir la carte",
   "about_title": "Une histoire de famille",
   "about_text": "Trois générations de cuisiniers, une seule obsession : la simplicité bien faite. Notre pâte lève 48 heures, nos pâtes sont roulées chaque matin, et nos sauces mijotent doucement. Buon appetito.",
   "highlights": [
     { "title": "Pâtes fraîches", "text": "Roulées chaque matin, jamais industrielles." },
     { "title": "Feu de bois", "text": "Nos pizzas cuisent en 90 secondes à 450°C." },
     { "title": "Produits d'Italie", "text": "Mozzarella, parmesan et huile importés directement." }
   ],
   "contact_intro": "Réservations et commandes spéciales : écrivez-nous."
 } $json$::jsonb),

-- ── 3. Noir (fullbleed) — gastronomique / sushi ──────────────────────
('Noir', 'demo-noir',
 $t$Cuisine gastronomique et sushis d'exception. Une expérience raffinée, livrée.$t$,
 '2 chemin des Crêtes', 'Alger', '0560333333', true, true, 400, 2000, 45, 'active', 3, true,
 $json$ {
   "hero_title": "L'art de la table, sublimé",
   "hero_subtitle": "Une cuisine d'auteur et des sushis préparés par nos maîtres, livrés avec le plus grand soin.",
   "hero_cta": "Découvrir le menu",
   "about_title": "L'excellence, sans compromis",
   "about_text": "Chaque assiette est pensée comme une œuvre : produits nobles, gestes précis, dressage millimétré. Notre chef sélectionne chaque matin le meilleur du marché pour une carte qui évolue au fil des saisons.",
   "highlights": [
     { "title": "Produits nobles", "text": "Poissons et viandes d'origine tracée, sélectionnés chaque jour." },
     { "title": "Dressage soigné", "text": "Chaque plat est dressé comme en salle, même pour la livraison." },
     { "title": "Service d'exception", "text": "Un emballage pensé pour préserver températures et textures." }
   ],
   "contact_intro": "Pour vos événements et menus privés, contactez-nous."
 } $json$::jsonb),

-- ── 4. Urban (bold) — street food ────────────────────────────────────
('Urban Smash', 'demo-urban',
 $t$Street food qui tape. Tacos, loaded fries et burgers XXL.$t$,
 '44 rue Hassiba Ben Bouali', 'Alger', '0560444444', true, true, 150, 500, 25, 'active', 4, true,
 $json$ {
   "hero_title": "Street food qui tape",
   "hero_subtitle": "Gros goût, gros format",
   "hero_cta": "Je commande",
   "about_title": "Né dans la rue",
   "about_text": "On a commencé avec un food-truck et une idée simple : de la street food sans chichis mais qui envoie. Des portions généreuses, des recettes qui osent, des prix qui restent corrects. C'est tout.",
   "highlights": [
     { "title": "Portions XXL", "text": "On ne compte pas, on remplit la boîte." },
     { "title": "Recettes audacieuses", "text": "Des associations qui sortent du lot, chaque mois." },
     { "title": "Prix street", "text": "Du bon, du gros, à prix raisonnable." }
   ],
   "contact_intro": "Une demande spéciale ? Lâche-nous un message."
 } $json$::jsonb),

-- ── 5. Pure (minimal) — healthy / poke ───────────────────────────────
('Pure', 'demo-pure',
 $t$Poke bowls, salades signature et jus pressés. Frais, sain, sans superflu.$t$,
 '9 rue des Frères Bouadou', 'Alger', '0560555555', true, true, 200, 700, 30, 'active', 5, true,
 $json$ {
   "hero_title": "Manger sain, simplement",
   "hero_subtitle": "Des bowls colorés, des produits frais, zéro complication.",
   "hero_cta": "Composer mon bowl",
   "about_title": "La simplicité comme luxe",
   "about_text": "Pure, c'est l'idée qu'un repas sain peut être beau, rapide et savoureux. On travaille des produits bruts, de saison, sans additifs. Le reste, c'est de l'équilibre — et un peu d'amour.",
   "highlights": [
     { "title": "Produits frais", "text": "Livrés chaque matin, préparés dans la journée." },
     { "title": "Équilibré", "text": "Chaque bowl est pensé pour son apport nutritionnel." },
     { "title": "Fait du jour", "text": "Rien ne dort au frigo : tout part le jour même." }
   ],
   "contact_intro": "Allergies, régimes : dites-nous tout."
 } $json$::jsonb),

-- ── 7. Cocon (magazine) — café / pâtisserie ──────────────────────────
('Cocon', 'demo-cocon',
 $t$Salon de thé gourmand : pâtisseries maison, brunch et boissons chaudes.$t$,
 '21 rue Didouche Mourad', 'Alger', '0560777777', true, true, 180, 600, 30, 'active', 7, true,
 $json$ {
   "hero_title": "Une parenthèse gourmande",
   "hero_subtitle": "Pâtisseries maison, brunchs généreux et chocolats chauds réconfortants.",
   "hero_cta": "Voir les douceurs",
   "about_title": "Comme à la maison",
   "about_text": "Cocon est né d'une envie de douceur. Un endroit chaleureux où l'on prend le temps, où les gâteaux sortent du four toute la journée et où le chocolat chaud est (vraiment) fait avec du vrai chocolat.",
   "highlights": [
     { "title": "Pâtisseries maison", "text": "Faites chaque jour, à l'ancienne." },
     { "title": "Brunch le week-end", "text": "Sucré, salé, et tout ce qu'il faut entre les deux." },
     { "title": "Cosy & chaleureux", "text": "L'esprit cocon, même en livraison." }
   ],
   "contact_intro": "Gâteaux sur commande : parlons-en."
 } $json$::jsonb)

on conflict (slug) do update set
  description  = excluded.description,
  template_id  = excluded.template_id,
  home_enabled = excluded.home_enabled,
  site_config  = excluded.site_config,
  status       = excluded.status;

-- ── Menus de démo (1 catégorie + plats, dont une offre) ──────────────
do $$
declare
  r uuid;
  c uuid;
begin
  -- 1. Saveur Burger
  select id into r from public.restaurants where slug='demo-saveur';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Burgers',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Classic Smash',$t$Steak smashé, cheddar, oignons, sauce maison.$t$,650,'dish',1),
      (r,c,'Double Cheese',$t$Double steak, double cheddar, cornichons.$t$,850,'dish',2),
      (r,c,'Chicken Crispy',$t$Poulet pané croustillant, salade, sauce ranch.$t$,700,'dish',3);
    insert into public.menu_items (restaurant_id, category_id, name, description, price, promo_price, item_type, offer_badge, offer_description, sort_order)
      values (r,c,'Menu Smash',$t$Burger + frites maison + boisson.$t$,950,800,'offer','-15%',$t$Burger + frites + boisson$t$,4);
  end if;

  -- 2. Bella Trattoria
  select id into r from public.restaurants where slug='demo-trattoria';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Pizzas & Pâtes',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Pizza Margherita',$t$Sauce tomate, mozzarella fior di latte, basilic.$t$,900,'dish',1),
      (r,c,'Quattro Formaggi',$t$Mozzarella, gorgonzola, parmesan, provolone.$t$,1100,'dish',2),
      (r,c,'Tagliatelle Bolognese',$t$Pâtes fraîches, ragù de bœuf mijoté.$t$,1000,'dish',3),
      (r,c,'Tiramisu',$t$Mascarpone, café, cacao. Le vrai.$t$,350,'dish',4);
  end if;

  -- 3. Noir
  select id into r from public.restaurants where slug='demo-noir';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Signatures',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Plateau sushi (16 pièces)',$t$Sélection du chef : saumon, thon, dorade.$t$,2200,'dish',1),
      (r,c,'Black Cod miso',$t$Morue charbonnière marinée 48h au miso.$t$,2800,'dish',2),
      (r,c,'Tataki de thon',$t$Thon rouge mi-cuit, sésame, ponzu.$t$,1900,'dish',3);
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, offer_badge, offer_description, sort_order)
      values (r,c,'Menu dégustation',$t$Cinq services par le chef. Sur réservation.$t$,4500,'offer','Chef',$t$5 services$t$,4);
  end if;

  -- 4. Urban Smash
  select id into r from public.restaurants where slug='demo-urban';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Street',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Tacos XXL',$t$Triple viande, frites dedans, sauce fromagère.$t$,800,'dish',1),
      (r,c,'Loaded Fries',$t$Frites, cheddar, bœuf haché, jalapeños.$t$,600,'dish',2),
      (r,c,'Smash x3',$t$Trois steaks smashés, triple cheddar.$t$,1200,'dish',3);
    insert into public.menu_items (restaurant_id, category_id, name, description, price, promo_price, item_type, offer_badge, offer_description, sort_order)
      values (r,c,'Box Urban',$t$Tacos + loaded fries + boisson.$t$,1500,1200,'offer','-20%',$t$Tacos + fries + boisson$t$,4);
  end if;

  -- 5. Pure
  select id into r from public.restaurants where slug='demo-pure';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Bowls & Jus',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Poke Saumon',$t$Riz vinaigré, saumon, avocat, edamame, mangue.$t$,1200,'dish',1),
      (r,c,'Buddha Bowl',$t$Quinoa, pois chiches rôtis, légumes de saison.$t$,1000,'dish',2),
      (r,c,'Salade César',$t$Poulet grillé, parmesan, croûtons, sauce légère.$t$,900,'dish',3),
      (r,c,'Jus détox pressé',$t$Pomme, céleri, citron, gingembre.$t$,400,'dish',4);
  end if;

  -- 7. Cocon
  select id into r from public.restaurants where slug='demo-cocon';
  if r is not null and not exists (select 1 from public.menu_categories where restaurant_id=r) then
    insert into public.menu_categories (restaurant_id, name, sort_order) values (r,'Douceurs',1) returning id into c;
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, sort_order) values
      (r,c,'Cheesecake maison',$t$Spéculoos, fromage frais, coulis de fruits rouges.$t$,450,'dish',1),
      (r,c,'Pancakes stack',$t$Trois pancakes moelleux, sirop d'érable, fruits.$t$,600,'dish',2),
      (r,c,'Chocolat chaud',$t$Vrai chocolat fondu, chantilly maison.$t$,350,'dish',3);
    insert into public.menu_items (restaurant_id, category_id, name, description, price, item_type, offer_badge, offer_description, sort_order)
      values (r,c,'Formule brunch',$t$Boisson chaude + sucré + salé + jus.$t$,1400,'offer','Week-end',$t$Brunch complet$t$,4);
  end if;
end $$;
