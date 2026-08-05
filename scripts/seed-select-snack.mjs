// =====================================================================
// Seed : restaurant "Select Snack" (by M&Y) — pizzeria / fast-food
//   - 1 owner restaurateur (auth.users + auth.identities + profile)
//   - 1 restaurant complet (site_config, hero/about, réseaux sociaux)
//   - 7 horaires d'ouverture
//   - 13 catégories, ~70 plats (pizzas, calzones, sandwichs, burgers,
//     tacos, poutines, plats, entrées, frites, suppléments, desserts,
//     boissons algériennes)
//   - 1 livreur / serveur "Serveur 1" (login username/password)
//   - Photos : URLs directes images.unsplash.com (autorisées par
//     next.config remotePatterns + CSP), toutes vérifiées 200.
//
// Lance :   node scripts/seed-select-snack.mjs
// Supprime : node scripts/db-apply.mjs --q "delete from restaurants where slug='select-snack'; delete from auth.users where email in ('select.snack@yelha.net','serveur1@livreur.delivery.yelha.net')"
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// ── Charge .env.local ──────────────────────────────────────────────────
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

// ── Identifiants choisis (imprimés en fin de script) ───────────────────
const SLUG = 'select-snack';
const RESTAURANT_NAME = 'Select Snack';
const OWNER_EMAIL = 'select.snack@yelha.net';
const OWNER_PASSWORD = 'SelectSnack@2026';
const OWNER_FULL_NAME = 'M&Y — Select Snack';

const SERVEUR_USERNAME = 'serveur1';
const SERVEUR_PASSWORD = 'Serveur1@2026';
const SERVEUR_FULL_NAME = 'Serveur 1';
const SERVEUR_EMAIL = `${SERVEUR_USERNAME}@livreur.delivery.yelha.net`;

// ── Pool photos (images.unsplash.com, toutes vérifiées HTTP 200) ───────
const U = (id, w = 900) => `https://images.unsplash.com/${id}?w=${w}&q=80`;
const IMG = {
  pizzaMargherita: U('photo-1574071318508-1cdbab80d002'),
  pizzaClassic: U('photo-1513104890138-7c749659a591'),
  pizzaPepperoni: U('photo-1628840042765-356cda07504e'),
  pizzaVeggie: U('photo-1565299624946-b28f40a0ae38'),
  pizzaSlices: U('photo-1594007654729-407eedc4be65'),
  pizzaWood: U('photo-1595854341625-f33ee10dbf94'),
  crevettesPizza: U('photo-1633504581786-316c8002b1b9'),
  saumon: U('photo-1519708227418-c8fd9a32b7a2'),
  merguez: U('photo-1626700051175-6818013e1d4f'),
  burgerClassic: U('photo-1568901346375-23c9450c58cd'),
  burgerDouble: U('photo-1550317138-10000687a72b'),
  burgerCheese: U('photo-1571091718767-18b5b1457add'),
  tacos1: U('photo-1565299585323-38d6b0865b47'),
  tacos2: U('photo-1611250188496-e966043a0629'),
  tacos3: U('photo-1552332386-f8dd00dc2f85'),
  sandwich1: U('photo-1553909489-cd47e0907980'),
  sandwichClub: U('photo-1528735602780-2552fd46c7af'),
  panini: U('photo-1509722747041-616f39b57569'),
  fries: U('photo-1573080496219-bb080dd4f877'),
  cheeseFries: U('photo-1541592106381-b31e9677c0e5'),
  poutine: U('photo-1585109649139-366815a0d713'),
  saladCaesar: U('photo-1550304943-4f24f54ddde9'),
  salad2: U('photo-1512621776951-a57141f2eefd'),
  tiramisu: U('photo-1571877227200-a0d98ea607e9'),
  mousseChoc: U('photo-1563805042-7684c019e1cb'),
  chocDessert: U('photo-1541783245831-57d6fb0926d3'),
  sodaCan: U('photo-1554866585-cd94860890b7'),
  soda2: U('photo-1629203851122-3726ecdf080e'),
  juice: U('photo-1600271886742-f049cd451bba'),
  water: U('photo-1560023907-5f339617ea30'),
  coffee: U('photo-1509042239860-f550ce710b93'),
  shrimp: U('photo-1625944230945-1b7dd3b949ab'),
  escalope: U('photo-1532550907401-a500c9a57435'),
  nuggets: U('photo-1562967914-608f82629710'),
  onionRings: U('photo-1639024471283-03518883512d'),
  steakPlate: U('photo-1600891964092-4316c288032e'),
  grilledChicken: U('photo-1598515214211-89d3c73ae83b'),
  calzone: U('photo-1631292784640-2b24be784d5d'),
  heroSpread: U('photo-1555939594-58d7cb561ad1', 1600),
  aboutKitchen: U('photo-1552566626-52f8b828add9', 1200),
};

// Helpers pour variantes
const pizza = (n, m) => [{ name: 'Normale', price: n }, { name: 'Méga', price: m }];
const menuOpt = (p) => [{ name: 'Seul', price: p }, { name: 'En menu (boisson + frites)', price: p + 250 }];

// ── Catégories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  'Pizzas Sauce Tomate',
  'Pizzas Sauce Fromagère',
  'Calzones',
  'Sandwichs',
  'Burgers',
  'Tacos',
  'Poutines',
  'Plats',
  'Entrées',
  'Frites',
  'Suppléments',
  'Desserts',
  'Boissons',
];

// ── Plats ──────────────────────────────────────────────────────────────
const ITEMS = [
  // ── Pizzas Sauce Tomate ──
  { cat: 'Pizzas Sauce Tomate', name: 'Margherite', desc: 'Sauce tomate, fromage.', price: 450, img: IMG.pizzaMargherita, variants: pizza(450, 1400) },
  { cat: 'Pizzas Sauce Tomate', name: 'Végétarienne', desc: 'Sauce tomate, fromage, tomate, oignons, poivrons, champignons frais, maïs, olives.', price: 700, img: IMG.pizzaVeggie, variants: pizza(700, 2200) },
  { cat: 'Pizzas Sauce Tomate', name: 'Napolitaine', desc: 'Sauce tomate, fromage, anchois, câpres.', price: 700, img: IMG.pizzaClassic, variants: pizza(700, 2200) },
  { cat: 'Pizzas Sauce Tomate', name: 'Poulet', desc: 'Sauce tomate, fromage, poulet.', price: 700, img: IMG.pizzaSlices, variants: pizza(700, 2200) },
  { cat: 'Pizzas Sauce Tomate', name: 'Poulet Fumé', desc: 'Sauce tomate, fromage, poulet fumé.', price: 750, img: IMG.pizzaSlices, variants: pizza(750, 2300) },
  { cat: 'Pizzas Sauce Tomate', name: 'Viande', desc: 'Sauce tomate, fromage, viande hachée.', price: 800, img: IMG.pizzaPepperoni, variants: pizza(800, 2300) },
  { cat: 'Pizzas Sauce Tomate', name: 'Thon', desc: 'Sauce tomate, fromage, thon.', price: 800, img: IMG.pizzaClassic, variants: pizza(800, 2400) },
  { cat: 'Pizzas Sauce Tomate', name: 'Merguez', desc: 'Sauce tomate, fromage, merguez.', price: 800, img: IMG.merguez, variants: pizza(800, 2400) },
  { cat: 'Pizzas Sauce Tomate', name: 'Pepperoni', desc: 'Sauce tomate, fromage, pepperoni.', price: 800, img: IMG.pizzaPepperoni, variants: pizza(800, 2400) },
  { cat: 'Pizzas Sauce Tomate', name: 'Mexicaine', desc: 'Sauce tomate, fromage, poulet, poivrons, oignons caramélisés, maïs, sauce mexicaine.', price: 800, img: IMG.pizzaVeggie, variants: pizza(800, 2400) },
  { cat: 'Pizzas Sauce Tomate', name: '3 Fromages', desc: 'Sauce tomate, fromage, camembert, fromage chef.', price: 800, img: IMG.pizzaMargherita, variants: pizza(800, 2400) },
  { cat: 'Pizzas Sauce Tomate', name: 'Fiesta', desc: 'Sauce tomate, fromage, viande hachée + poulet, poivrons, herbes de Provence.', price: 900, img: IMG.pizzaWood, variants: pizza(900, 2800) },
  { cat: 'Pizzas Sauce Tomate', name: 'Buffalo', desc: 'Sauce tomate, fromage, viande hachée, poivrons, sauce barbecue.', price: 900, img: IMG.pizzaPepperoni, variants: pizza(900, 2800) },

  // ── Pizzas Sauce Fromagère ──
  { cat: 'Pizzas Sauce Fromagère', name: 'Boisée Viande', desc: 'Sauce fromagère, fromage, viande hachée, poivrons.', price: 950, img: IMG.pizzaWood, variants: pizza(950, 2800) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Boisée Poulet Fumé', desc: 'Sauce fromagère, fromage, poulet fumé, poivrons.', price: 950, img: IMG.pizzaSlices, variants: pizza(950, 2800) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Forestière', desc: 'Sauce fromagère, fromage, poulet, champignons frais.', price: 950, img: IMG.pizzaClassic, variants: pizza(950, 2800) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Cordon Bleu', desc: 'Sauce fromagère, fromage, poulet pané, poulet fumé.', price: 1000, img: IMG.pizzaWood, variants: pizza(1000, 3000) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Champignons', desc: 'Sauce fromagère, fromage, champignons frais.', price: 800, img: IMG.pizzaVeggie, variants: pizza(800, 2500) },
  { cat: 'Pizzas Sauce Fromagère', name: '4 Fromages', desc: 'Sauce fromagère, cheddar, mozzarella, gruyère, camembert.', price: 1000, img: IMG.pizzaMargherita, variants: pizza(1000, 3000) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Blanca', desc: 'Sauce fromagère, fromage, viande hachée + poulet, gruyère.', price: 1300, img: IMG.pizzaWood, variants: pizza(1300, 3500) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Saumon Fumé', desc: 'Sauce fromagère, fromage, saumon fumé.', price: 1500, img: IMG.saumon, variants: pizza(1500, 4500) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Crevettes', desc: 'Sauce fromagère, fromage, crevettes fraîches, gruyère.', price: 1500, img: IMG.crevettesPizza, variants: pizza(1500, 4500) },
  { cat: 'Pizzas Sauce Fromagère', name: 'Select', desc: 'La pizza signature de la maison — ingrédients surprise du chef.', price: 1500, img: IMG.pizzaWood, variants: pizza(1500, 4500) },

  // ── Calzones (Menu : boisson + barquette de frites +250 DA) ──
  { cat: 'Calzones', name: 'Calzone Poulet', desc: 'Sauce tomate, fromage, poulet. Menu (boisson + frites) : +250 DA.', price: 600, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone Poulet Fumé', desc: 'Sauce fromagère, fromage, poulet fumé, champignons. Menu (boisson + frites) : +250 DA.', price: 700, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone Viande', desc: 'Sauce tomate, fromage, viande. Menu (boisson + frites) : +250 DA.', price: 700, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone Thon', desc: 'Sauce tomate, fromage, thon. Menu (boisson + frites) : +250 DA.', price: 700, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone Mixte', desc: 'Sauce tomate, fromage, poulet + viande, poivrons. Menu (boisson + frites) : +250 DA.', price: 800, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone 3 Fromages', desc: 'Sauce fromagère, fromage, camembert. Menu (boisson + frites) : +250 DA.', price: 800, img: IMG.calzone },
  { cat: 'Calzones', name: 'Calzone Crevettes', desc: 'Sauce fromagère, fromage, crevettes fraîches. Menu (boisson + frites) : +250 DA.', price: 1000, img: IMG.crevettesPizza },

  // ── Sandwichs (variantes : seul / en menu +250 ; 3 fromages +200) ──
  { cat: 'Sandwichs', name: 'Chiken', desc: 'Sauce maison, crudités, frites, poulet mariné, fromage.', price: 450, img: IMG.sandwich1, variants: menuOpt(450) },
  { cat: 'Sandwichs', name: 'Meat', desc: 'Sauce maison, crudités, frites, steak haché, fromage.', price: 500, img: IMG.sandwichClub, variants: menuOpt(500) },
  { cat: 'Sandwichs', name: 'Crispy', desc: 'Sauce maison, frites, poulet pané, sauce fromagère, fromage.', price: 500, img: IMG.panini, variants: menuOpt(500) },
  { cat: 'Sandwichs', name: 'Mexicano', desc: 'Sauce mexicaine, crudités, frites, poulet ou viande au choix, poivrons, oignons caramélisés, maïs.', price: 600, img: IMG.sandwich1, variants: menuOpt(600) },
  { cat: 'Sandwichs', name: 'Cordon Bleu', desc: 'Crudités, frites, poulet pané, poulet fumé, sauce fromagère, fromage.', price: 650, img: IMG.panini, variants: menuOpt(650) },
  { cat: 'Sandwichs', name: 'Mixte', desc: 'Sauce maison, crudités, frites, poulet + steak haché, fromage.', price: 650, img: IMG.sandwichClub, variants: menuOpt(650) },
  { cat: 'Sandwichs', name: 'Steak', desc: 'Sauce maison, frites, steak émincé, oignons grillés, champignons frais, sauce fromagère, fromage.', price: 750, img: IMG.sandwichClub, variants: menuOpt(750) },
  { cat: 'Sandwichs', name: 'Le Suisse', desc: 'Sauce maison, crudités, frites, poulet, oignons caramélisés, champignons frais, sauce fromagère, fromage.', price: 750, img: IMG.sandwich1, variants: menuOpt(750) },
  { cat: 'Sandwichs', name: 'Le Full', desc: 'Sauce maison, crudités, frites, steak haché 150g, poulet fumé, œufs, fromage.', price: 800, img: IMG.sandwichClub, variants: menuOpt(800) },
  { cat: 'Sandwichs', name: 'Crevettes', desc: 'Sauce maison, crudités, frites, crevettes fraîches, fromage.', price: 850, img: IMG.shrimp, variants: menuOpt(850) },

  // ── Burgers (tailles M / L ; Menu +250 DA) ──
  { cat: 'Burgers', name: 'Chiken', desc: 'Blanc de poulet haché, crudités, sauce maison, fromage. Menu (boisson + frites) : +250 DA.', price: 350, img: IMG.burgerClassic, variants: [{ name: 'M', price: 350 }, { name: 'L', price: 500 }] },
  { cat: 'Burgers', name: 'Classic', desc: 'Steak haché, crudités, sauce maison, fromage. Menu (boisson + frites) : +250 DA.', price: 450, img: IMG.burgerClassic, variants: [{ name: 'M', price: 450 }, { name: 'L', price: 650 }] },
  { cat: 'Burgers', name: 'Crispy', desc: 'Poulet pané, crudités, sauce maison, sauce fromagère, fromage. Menu (boisson + frites) : +250 DA.', price: 500, img: IMG.burgerClassic },
  { cat: 'Burgers', name: 'Egg', desc: 'Steak haché, œuf, crudités, sauce maison, fromage. Menu (boisson + frites) : +250 DA.', price: 500, img: IMG.burgerCheese },
  { cat: 'Burgers', name: 'Select', desc: 'Steak haché, oignons caramélisés, camembert, crudités, sauce maison. Menu (boisson + frites) : +250 DA.', price: 500, img: IMG.burgerCheese, variants: [{ name: 'M', price: 500 }, { name: 'L', price: 700 }] },
  { cat: 'Burgers', name: 'Mexicano', desc: 'Steak haché, crudités, sauce mexicaine, poivrons, oignons caramélisés, maïs, fromage. Menu (boisson + frites) : +250 DA.', price: 550, img: IMG.burgerDouble, variants: [{ name: 'M', price: 550 }, { name: 'L', price: 700 }] },
  { cat: 'Burgers', name: 'Forest', desc: 'Steak haché, oignons caramélisés, champignons frais, crudités, sauce fromagère, fromage. Menu (boisson + frites) : +250 DA.', price: 550, img: IMG.burgerDouble, variants: [{ name: 'M', price: 550 }, { name: 'L', price: 750 }] },
  { cat: 'Burgers', name: 'Cordon Bleu', desc: 'Poulet pané, poulet fumé, crudités, sauce fromagère, fromage. Menu (boisson + frites) : +250 DA.', price: 650, img: IMG.burgerClassic },
  { cat: 'Burgers', name: 'Le Fermier', desc: 'Steak haché, oignons caramélisés, camembert, crudités, miel. Menu (boisson + frites) : +250 DA.', price: 650, img: IMG.burgerCheese },
  { cat: 'Burgers', name: 'Mixte', desc: 'Poulet pané, steak haché, crudités, sauce maison, sauce fromagère, double fromage. Menu (boisson + frites) : +250 DA.', price: 800, img: IMG.burgerDouble },
  { cat: 'Burgers', name: 'Juicy Lucy', desc: 'Steak haché 150g fourré au fromage, crudités, cornichons, sauce maison. Menu (boisson + frites) : +250 DA.', price: 800, img: IMG.burgerDouble },
  { cat: 'Burgers', name: 'Le King', desc: 'Steak haché 150g, poulet fumé, œufs, crudités, sauce maison, fromage. Menu (boisson + frites) : +250 DA.', price: 800, img: IMG.burgerDouble },

  // ── Tacos (tailles M / L / XL ; Menu +250 ; gratiné M+200/L+250/XL+300) ──
  { cat: 'Tacos', name: 'Chiken', desc: 'Poulet mariné, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA. Gratiné en supplément.', price: 650, img: IMG.tacos1, variants: [{ name: 'M', price: 650 }, { name: 'L', price: 800 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Crispy', desc: 'Poulet pané, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA. Gratiné en supplément.', price: 700, img: IMG.tacos2, variants: [{ name: 'M', price: 700 }, { name: 'L', price: 850 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Meat', desc: 'Steak haché, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA. Gratiné en supplément.', price: 750, img: IMG.tacos3, variants: [{ name: 'M', price: 750 }, { name: 'L', price: 900 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Mixte', desc: 'Steak haché, poulet mariné, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA. Gratiné en supplément.', price: 750, img: IMG.tacos1, variants: [{ name: 'M', price: 750 }, { name: 'L', price: 900 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Mexicano', desc: 'Steak haché ou poulet au choix, frites, oignons caramélisés, poivrons, maïs, sauce mexicaine, fromage. Menu : +250 DA.', price: 800, img: IMG.tacos2, variants: [{ name: 'M', price: 800 }, { name: 'L', price: 950 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Le Suisse', desc: 'Poulet mariné, frites, champignons frais, oignons caramélisés, sauce fromagère, sauce maison, fromage. Menu : +250 DA.', price: 800, img: IMG.tacos3, variants: [{ name: 'M', price: 800 }, { name: 'L', price: 950 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Cordon Bleu', desc: 'Poulet pané, poulet fumé, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA.', price: 850, img: IMG.tacos1, variants: [{ name: 'M', price: 850 }, { name: 'L', price: 1000 }, { name: 'XL', price: 1300 }] },
  { cat: 'Tacos', name: 'Steak', desc: 'Steak émincé, frites, champignons frais, oignons grillés, sauce fromagère, sauce maison, fromage. Menu : +250 DA.', price: 900, img: IMG.tacos3, variants: [{ name: 'M', price: 900 }, { name: 'L', price: 1200 }, { name: 'XL', price: 1500 }] },
  { cat: 'Tacos', name: 'Crevettes', desc: 'Crevettes fraîches, frites, sauce fromagère, sauce maison, fromage. Menu : +250 DA.', price: 1000, img: IMG.shrimp, variants: [{ name: 'M', price: 1000 }, { name: 'L', price: 1300 }, { name: 'XL', price: 1600 }] },

  // ── Poutines ──
  { cat: 'Poutines', name: 'Poutine Viande', desc: 'Frites, steak haché, poivrons, oignons caramélisés, sauce fromagère gratinée.', price: 750, img: IMG.poutine },
  { cat: 'Poutines', name: 'Poutine Poulet', desc: 'Frites, poulet mariné, champignons frais, oignons caramélisés, sauce fromagère gratinée.', price: 750, img: IMG.cheeseFries },
  { cat: 'Poutines', name: 'Poutine Krusty', desc: 'Frites, poulet pané, sauce fromagère, fromage gratiné.', price: 750, img: IMG.poutine },
  { cat: 'Poutines', name: 'Smoky', desc: 'Frites, poulet pané, poulet fumé, sauce fromagère, sauce barbecue, fromage gratiné.', price: 900, img: IMG.cheeseFries },
  { cat: 'Poutines', name: 'Crevettes', desc: 'Frites, crevettes fraîches, sauce fromagère, fromage gratiné.', price: 900, img: IMG.shrimp },

  // ── Plats ──
  { cat: 'Plats', name: 'Escalope Grillée', desc: 'Tranches de blanc de poulet mariné, accompagnées de frites, riz et légumes sautés.', price: 850, img: IMG.grilledChicken },
  { cat: 'Plats', name: 'Escalope à la Milanaise', desc: 'Blanc de poulet pané, accompagné de frites, riz, légumes sautés et sauce fromagère.', price: 1000, img: IMG.escalope },
  { cat: 'Plats', name: 'Meat', desc: 'Steak haché, œuf à cheval, accompagné de frites, riz et légumes sautés.', price: 1000, img: IMG.steakPlate },
  { cat: 'Plats', name: 'Steak', desc: 'Steak assaisonné, accompagné de frites, riz et légumes sautés.', price: 1500, img: IMG.steakPlate },

  // ── Entrées ──
  { cat: 'Entrées', name: 'Salade César', desc: 'Salade fraîche, poulet, croûtons, parmesan, sauce César.', price: 500, img: IMG.saladCaesar },
  { cat: 'Entrées', name: 'Salade de Thon', desc: 'Salade composée, thon, crudités de saison.', price: 500, img: IMG.salad2 },
  { cat: 'Entrées', name: 'Camembert Pané', desc: 'Camembert pané et frit, croustillant dehors, fondant dedans.', price: 450, img: IMG.nuggets },
  { cat: 'Entrées', name: 'Tenders de Poulet', desc: 'Aiguillettes de poulet panées, croustillantes.', price: 450, img: IMG.nuggets },

  // ── Frites ──
  { cat: 'Frites', name: 'Barquette de Frites', desc: 'Frites maison croustillantes.', price: 150, img: IMG.fries },
  { cat: 'Frites', name: 'Frites Sauce Fromagère', desc: 'Frites nappées de sauce fromagère.', price: 250, img: IMG.cheeseFries },
  { cat: 'Frites', name: 'Frites Gratinées', desc: 'Frites, sauce fromagère, oignons crus (au choix), cheddar gratiné.', price: 450, img: IMG.cheeseFries },

  // ── Suppléments ──
  { cat: 'Suppléments', name: 'Oignons Caramélisés & Œufs', desc: 'Supplément au choix.', price: 50, img: IMG.onionRings },
  { cat: 'Suppléments', name: 'Champignons Frais & Camembert', desc: 'Supplément au choix.', price: 100, img: IMG.onionRings },
  { cat: 'Suppléments', name: 'Cheddar, Gruyère, Sauce Fromagère & Poulet Fumé', desc: 'Supplément généreux au choix.', price: 150, img: IMG.cheeseFries },
  { cat: 'Suppléments', name: 'Extra Cheese (Pizza)', desc: 'Supplément fromage pour votre pizza. Normale : 300 DA · Méga : 1200 DA.', price: 300, img: IMG.pizzaMargherita, variants: [{ name: 'Normale', price: 300 }, { name: 'Méga', price: 1200 }] },
  { cat: 'Suppléments', name: 'Bordures Fromages (Pizza)', desc: 'Croûte farcie au fromage. Normale : 100 DA · Méga : 300 DA.', price: 100, img: IMG.pizzaMargherita, variants: [{ name: 'Normale', price: 100 }, { name: 'Méga', price: 300 }] },
  { cat: 'Suppléments', name: 'Sauce Fromagère (Pizza)', desc: 'Base sauce fromagère. Normale : 150 DA · Méga : 500 DA.', price: 150, img: IMG.cheeseFries, variants: [{ name: 'Normale', price: 150 }, { name: 'Méga', price: 500 }] },

  // ── Desserts ──
  { cat: 'Desserts', name: 'Tiramisu', desc: 'Le classique italien, mascarpone et café.', price: 300, img: IMG.tiramisu },
  { cat: 'Desserts', name: 'Mousse au Chocolat', desc: 'Mousse onctueuse au chocolat noir.', price: 300, img: IMG.mousseChoc },

  // ── Boissons (dont boissons algériennes) ──
  { cat: 'Boissons', name: 'Selecto (canette 33cl)', desc: 'Le soda emblématique d’Hamoud Boualem.', price: 150, img: IMG.sodaCan },
  { cat: 'Boissons', name: 'Hamoud Boualem (canette 33cl)', desc: 'La limonade pétillante algérienne, la référence depuis 1878.', price: 150, img: IMG.sodaCan },
  { cat: 'Boissons', name: 'Slim Orange / Citron (canette 33cl)', desc: 'Soda fruité d’Hamoud Boualem.', price: 150, img: IMG.sodaCan },
  { cat: 'Boissons', name: 'Boisson Rouge Hamoud (canette 33cl)', desc: 'La fameuse boisson rouge à la grenadine.', price: 150, img: IMG.sodaCan },
  { cat: 'Boissons', name: 'Coca-Cola / Fanta / Sprite (canette 33cl)', desc: 'Sodas au choix, bien frais.', price: 150, img: IMG.sodaCan },
  { cat: 'Boissons', name: 'Selecto / Soda (bouteille 1L)', desc: 'Grand format à partager.', price: 100, img: IMG.soda2 },
  { cat: 'Boissons', name: 'Jus N’Gaous (Abricot)', desc: 'Nectar d’abricot algérien.', price: 100, img: IMG.juice },
  { cat: 'Boissons', name: 'Jus Rouiba', desc: 'Jus de fruits, saveurs au choix.', price: 100, img: IMG.juice },
  { cat: 'Boissons', name: 'Eau Minérale Ifri (50cl)', desc: 'Eau minérale naturelle.', price: 50, img: IMG.water },
  { cat: 'Boissons', name: 'Eau Gazeuse Ifri (50cl)', desc: 'Eau minérale gazeuse.', price: 50, img: IMG.water },
  { cat: 'Boissons', name: 'Café', desc: 'Café serré, à emporter.', price: 150, img: IMG.coffee },
];

// ── Connexion PG ───────────────────────────────────────────────────────
const client = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || 'postgres',
        ssl: { rejectUnauthorized: false },
      },
);
const q = (sql, params = []) => client.query(sql, params);

async function createAuthUser(email, password, meta) {
  const id = randomUUID();
  await q(
    `insert into auth.users (
       instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change
     ) values (
       '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
       $2, crypt($3, gen_salt('bf')),
       now(), '{"provider":"email","providers":["email"]}'::jsonb, $4::jsonb,
       now(), now(), '', '', '', ''
     )`,
    [id, email, password, JSON.stringify(meta || {})],
  );
  await q(
    `insert into auth.identities (
       provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
     ) values (
       $1::text, $1::uuid,
       jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true),
       'email', now(), now(), now()
     )`,
    [id, email],
  );
  return id;
}

async function main() {
  console.log('\n→ Connexion à la DB…');
  await client.connect();

  const exists = await q('select id from restaurants where slug=$1', [SLUG]);
  if (exists.rowCount > 0) {
    console.error(`\n✗ Le slug "${SLUG}" existe déjà. Supprime-le avant de relancer.`);
    await client.end();
    process.exit(1);
  }

  await q('begin');

  // 1. Owner restaurateur
  console.log(`\n→ Owner ${OWNER_EMAIL}…`);
  const ownerId = await createAuthUser(OWNER_EMAIL, OWNER_PASSWORD, { role: 'restaurateur' });
  await q(
    `insert into profiles (id, role, full_name, is_active) values ($1, 'restaurateur', $2, true)
     on conflict (id) do update set role='restaurateur', full_name=excluded.full_name, is_active=true`,
    [ownerId, OWNER_FULL_NAME],
  );
  console.log(`  ✓ owner_id = ${ownerId}`);

  // 2. Restaurant
  console.log(`\n→ Restaurant "${RESTAURANT_NAME}"…`);
  const siteConfig = {
    hero_title: 'Select Snack — pizzas & fast-food, by M&Y',
    hero_subtitle:
      'Pizzas au feu de bois, tacos gratinés, burgers maison, poutines généreuses. Préparés à la commande et livrés bien chauds.',
    hero_cta: 'Voir la carte',
    hero_image_url: IMG.heroSpread,
    about_title: 'Le goût qui fait la différence',
    about_text:
      'Chez Select Snack, tout est préparé minute : pâte à pizza travaillée maison, sauces fromagères onctueuses, viandes marinées et frites fraîches. De la pizza Select aux tacos XL en passant par nos burgers signature, on met la générosité au cœur de chaque commande.\n\nUne petite faim ou un grand appétit ? On a la formule qu’il vous faut, à emporter ou en livraison.',
    about_image_url: IMG.aboutKitchen,
    contact_intro: 'Une commande spéciale, une question ? Écrivez-nous, on répond vite.',
    gallery: [IMG.pizzaWood, IMG.tacos1, IMG.burgerDouble, IMG.crevettesPizza],
    social: {
      instagram: 'https://instagram.com/select_snack',
      facebook: 'https://facebook.com/select_snack',
      tiktok: 'https://tiktok.com/@select_snack',
    },
    highlights: [
      { title: 'Pizzas au feu de bois', title_fallback: 'Pizzas', text: 'Pâte maison, cuisson au feu de bois, garnitures généreuses.' },
      { title: 'Fait minute', text: 'Viandes marinées, sauces maison, frites fraîches à chaque commande.' },
      { title: 'Livraison chaude', text: 'Emballage soigné : vos plats arrivent à bonne température.' },
    ],
  };
  const restoIns = await q(
    `insert into restaurants (
       owner_id, name, slug, description, address, city, phone,
       banner_text, is_open, accept_orders, delivery_fee, min_order,
       estimated_delivery_time, status, template_id, site_config,
       home_enabled, blog_enabled, cuisine_type, price_range
     ) values (
       $1,$2,$3,$4,$5,$6,$7,
       $8, true, true, 200, 0,
       30, 'active', 3, $9::jsonb,
       true, false, $10, $11
     ) returning id`,
    [
      ownerId,
      RESTAURANT_NAME,
      SLUG,
      'Pizzas au feu de bois, tacos, burgers, poutines et sandwichs. Le fast-food généreux by M&Y.',
      'À compléter dans le tableau de bord',
      'Alger',
      '0559773879',
      '🍕 Menu (boisson + barquette de frites) offert dès 250 DA sur sandwichs, burgers, tacos & calzones !',
      JSON.stringify(siteConfig),
      'Pizza & Fast-food',
      '$$',
    ],
  );
  const restaurantId = restoIns.rows[0].id;
  await q('update profiles set restaurant_id=$1 where id=$2', [restaurantId, ownerId]);
  console.log(`  ✓ restaurant_id = ${restaurantId}`);

  // 3. Horaires (7j, 11h–23h30)
  console.log('\n→ Horaires (7 jours, 11h–23h30)…');
  for (let d = 1; d <= 7; d++) {
    await q(
      `insert into opening_hours (restaurant_id, day_of_week, opens_at, closes_at, is_closed)
       values ($1,$2,'11:00:00','23:30:00',false)`,
      [restaurantId, d],
    );
  }
  console.log('  ✓ ouvert tous les jours');

  // 4. Catégories
  console.log('\n→ Catégories…');
  const catIds = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const r = await q(
      `insert into menu_categories (restaurant_id, name, sort_order, is_visible)
       values ($1,$2,$3,true) returning id`,
      [restaurantId, CATEGORIES[i], i],
    );
    catIds[CATEGORIES[i]] = r.rows[0].id;
  }
  console.log(`  ✓ ${CATEGORIES.length} catégories`);

  // 5. Plats + variantes
  console.log(`\n→ Plats (${ITEMS.length})…`);
  const seq = {};
  for (const it of ITEMS) {
    const so = (seq[it.cat] = (seq[it.cat] ?? -1) + 1);
    const ins = await q(
      `insert into menu_items (
         restaurant_id, category_id, name, description, price, promo_price,
         item_type, is_extra, image_url, is_available, sort_order
       ) values ($1,$2,$3,$4,$5,$6,'dish',false,$7,true,$8) returning id`,
      [restaurantId, catIds[it.cat], it.name, it.desc, it.price, it.promo ?? null, it.img, so],
    );
    const itemId = ins.rows[0].id;
    if (it.variants) {
      for (let j = 0; j < it.variants.length; j++) {
        const v = it.variants[j];
        await q(
          `insert into menu_item_variants (menu_item_id, name, price, is_available, sort_order)
           values ($1,$2,$3,true,$4)`,
          [itemId, v.name, v.price, j],
        );
      }
    }
  }
  console.log(`  ✓ ${ITEMS.length} plats insérés`);

  // 6. Livreur / Serveur 1
  console.log(`\n→ Serveur 1 (${SERVEUR_USERNAME})…`);
  const serveurId = await createAuthUser(SERVEUR_EMAIL, SERVEUR_PASSWORD, {
    username: SERVEUR_USERNAME,
    role: 'livreur',
  });
  await q(
    `insert into profiles (id, role, restaurant_id, username, full_name, is_active)
     values ($1,'livreur',$2,$3,$4,true)
     on conflict (id) do update set role='livreur', restaurant_id=$2, username=$3, full_name=$4, is_active=true`,
    [serveurId, restaurantId, SERVEUR_USERNAME, SERVEUR_FULL_NAME],
  );
  console.log(`  ✓ serveur_id = ${serveurId}`);

  await q('commit');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yelha.net';
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ✓ SELECT SNACK — SEED TERMINÉ                                    ║
╚══════════════════════════════════════════════════════════════════╝

  Restaurant    : ${RESTAURANT_NAME}
  Slug          : ${SLUG}
  Restaurant ID : ${restaurantId}
  Catégories    : ${CATEGORIES.length}
  Plats         : ${ITEMS.length}

  ── Compte RESTAURATEUR (login /login, par email) ──
    Email    : ${OWNER_EMAIL}
    Password : ${OWNER_PASSWORD}

  ── Compte SERVEUR 1 (login livreur, par identifiant) ──
    Identifiant : ${SERVEUR_USERNAME}
    Password    : ${SERVEUR_PASSWORD}

  URLs :
    Site public : ${appUrl}/r/${SLUG}
    Menu        : ${appUrl}/r/${SLUG}/menu
    Dashboard   : ${appUrl}/dashboard
`);

  await client.end();
}

main().catch(async (e) => {
  console.error('\n✗ ÉCHEC:', e.message);
  console.error(e.stack);
  try { await q('rollback'); } catch {}
  try { await client.end(); } catch {}
  process.exit(1);
});
