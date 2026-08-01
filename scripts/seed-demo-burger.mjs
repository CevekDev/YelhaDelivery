// =====================================================================
// Seed démo : restaurant "Burger Paradise" complet
//   - 1 owner restaurateur (auth.users + auth.identities + profile)
//   - 1 restaurant avec site_config (hero, about, gallery, highlights, social)
//   - 7 horaires d'ouverture
//   - 4 catégories
//   - 12 plats avec photos
//   - 3 articles de blog avec cover
//   - Upload des photos depuis Unsplash → Supabase Storage
//
// Pré-requis dans .env.local :
//   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE  (déjà présents)
//   NEXT_PUBLIC_SUPABASE_URL=https://<votre-project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
//   DEMO_OWNER_PASSWORD=<mot de passe du compte démo>  (optionnel : sinon généré)
//
// Lance :
//   node scripts/seed-demo-burger.mjs
//
// Pour supprimer le resto démo après le test :
//   node scripts/db-apply.mjs --q "delete from restaurants where slug='burger-paradise'"
//   (la cascade nettoie menus, blog, hours, profile.restaurant_id)
// =====================================================================

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';

// ── 1. Charge .env.local ──────────────────────────────────────────────
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(`
✗ Variables manquantes dans .env.local.

Ajoute ces 2 lignes (récupère-les sur https://supabase.com/dashboard/project/<votre-project-ref>/settings/api-keys) :

NEXT_PUBLIC_SUPABASE_URL=https://<votre-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<colle ta clé service_role ici>
`);
  process.exit(1);
}

// ── 2. Configuration du seed ──────────────────────────────────────────
const SLUG = 'burger-paradise';
const RESTAURANT_NAME = 'Burger Paradise';
const OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || 'demo-burger@yelha.local';
// Jamais de secret en dur : pris dans l'env, sinon généré aléatoirement et
// imprimé en fin de script (compte de démo uniquement).
const OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || `demo-${randomBytes(9).toString('base64url')}`;
const OWNER_FULL_NAME = 'Sami Boudjellal';

// Photos Unsplash (sans clé API, format direct CDN)
const IMG = {
  hero: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&q=80',
  about: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=1200&q=80',
  gallery: [
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&q=80',
    'https://images.unsplash.com/photo-1606755456206-b25206cde27e?w=1200&q=80',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1200&q=80',
    'https://images.unsplash.com/photo-1550317138-10000687a72b?w=1200&q=80',
  ],
  banner: 'https://images.unsplash.com/photo-1561758033-7e924f619b47?w=1600&q=80',
  blog: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
    'https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=1200&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
  ],
  items: {
    classic: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80',
    cheese: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=900&q=80',
    double: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=900&q=80',
    bbq: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=900&q=80',
    chicken: 'https://images.unsplash.com/photo-1606755456206-b25206cde27e?w=900&q=80',
    veggie: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=900&q=80',
    fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&q=80',
    onions: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=900&q=80',
    nuggets: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=900&q=80',
    coke: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=900&q=80',
    milkshake: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=900&q=80',
    brownie: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80',
  },
};

const CATEGORIES = [
  { name: 'Nos Burgers', sort: 1 },
  { name: 'À Côté', sort: 2 },
  { name: 'Boissons', sort: 3 },
  { name: 'Desserts', sort: 4 },
];

// price en DA, suivant les conventions du projet
const ITEMS = [
  {
    cat: 'Nos Burgers', name: 'Classic Beef', desc: 'Steak haché 100% boeuf, salade, tomate, oignon caramélisé, sauce maison.',
    price: 850, promo: null, img: 'classic',
    variants: [{ name: 'Solo (1 steak)', price: 850 }, { name: 'Double (2 steaks)', price: 1200 }],
  },
  {
    cat: 'Nos Burgers', name: 'Cheese Lover', desc: 'Triple cheddar fondu, bacon grillé, oignon frit, sauce cheddar.',
    price: 1050, promo: 950, img: 'cheese',
    variants: [{ name: 'Solo', price: 950 }, { name: 'Double cheese', price: 1300 }],
  },
  {
    cat: 'Nos Burgers', name: 'BBQ Bacon', desc: 'Sauce BBQ fumée, bacon croustillant, oignons frits, cornichons.',
    price: 1100, promo: null, img: 'bbq',
  },
  {
    cat: 'Nos Burgers', name: 'Double Stack', desc: 'Deux steaks juteux, double cheddar, sauce burger maison, salade fraîche.',
    price: 1350, promo: null, img: 'double',
  },
  {
    cat: 'Nos Burgers', name: 'Crispy Chicken', desc: 'Filet de poulet pané croustillant, sauce moutarde-miel, salade iceberg.',
    price: 950, promo: null, img: 'chicken',
  },
  {
    cat: 'Nos Burgers', name: 'Veggie Power', desc: 'Galette de pois chiches & légumes, avocat, tomate, sauce yaourt.',
    price: 850, promo: null, img: 'veggie',
  },
  {
    cat: 'À Côté', name: 'Frites Maison', desc: 'Pommes de terre fraîches, double cuisson, fleur de sel.',
    price: 250, promo: null, img: 'fries',
    variants: [{ name: 'Petite', price: 250 }, { name: 'Moyenne', price: 350 }, { name: 'Grande', price: 450 }],
  },
  {
    cat: 'À Côté', name: 'Onion Rings', desc: 'Rondelles d\'oignon panées, sauce barbecue.',
    price: 350, promo: null, img: 'onions',
  },
  {
    cat: 'À Côté', name: 'Nuggets x6', desc: 'Pépites de poulet panées, sauce au choix.',
    price: 400, promo: null, img: 'nuggets',
  },
  {
    cat: 'Boissons', name: 'Soda 33cl', desc: 'Coca-Cola, Sprite, Fanta — au choix.',
    price: 150, promo: null, img: 'coke',
  },
  {
    cat: 'Desserts', name: 'Milkshake', desc: 'Vanille, chocolat ou fraise. Onctueux, fait minute.',
    price: 400, promo: null, img: 'milkshake',
    variants: [{ name: 'Vanille', price: 400 }, { name: 'Chocolat', price: 400 }, { name: 'Fraise', price: 400 }],
  },
  {
    cat: 'Desserts', name: 'Brownie Chocolat', desc: 'Coulant chocolat noir, noix de pécan, glace vanille.',
    price: 450, promo: null, img: 'brownie',
  },
];

const BLOG_POSTS = [
  {
    title: 'Pourquoi notre viande fait la différence',
    slug: 'viande-difference',
    excerpt: 'Origine, race, maturation : on vous explique le secret de notre steak haché.',
    content: `# Pourquoi notre viande fait la différence

Chez Burger Paradise, on ne plaisante pas avec la qualité.

## Une viande sélectionnée

Notre boucher partenaire travaille avec des **éleveurs locaux** qui élèvent leurs bêtes en pâturage. La race **Angus** apporte le persillé qui fait le moelleux du steak.

## Une maturation de 28 jours

Avant d'être hachée, la viande est maturée en chambre froide pendant 28 jours. Ce processus développe les arômes et attendrit naturellement les fibres.

## Hachage du jour

Chaque matin, on hache la viande à la commande. Pas de viande pré-emballée, pas de chaîne du froid douteuse. Juste du frais, du vrai.

C'est ce qui fait que notre **Classic Beef** a ce goût qu'on retrouve nulle part ailleurs.`,
    cover: 'blog[0]',
  },
  {
    title: 'Le secret de nos frites fraîches',
    slug: 'frites-fraiches-secret',
    excerpt: 'Pourquoi nos frites sont coupées le matin et pourquoi ça change tout.',
    content: `# Le secret de nos frites fraîches

Une bonne frite, c'est trois choses : **la pomme de terre, la coupe, et la cuisson**.

## La variété compte

On utilise exclusivement de la **Bintje**, la variété historique de la frite. Sa chair farineuse donne ce contraste parfait : croustillant dehors, fondant dedans.

## Double cuisson maison

Première cuisson à **150°C** pour cuire l'intérieur. On laisse reposer, puis deuxième cuisson à **180°C** pour le croustillant.

Le résultat ? Des frites qui restent croustillantes 10 minutes après être sorties de la friteuse. Le test ultime.`,
    cover: 'blog[1]',
  },
  {
    title: 'Nos sauces, faites maison chaque matin',
    slug: 'sauces-maison',
    excerpt: 'BBQ, burger, cheddar, moutarde-miel : zoom sur notre cuisine du quotidien.',
    content: `# Nos sauces, faites maison chaque matin

Nos sauces, c'est notre signature. Elles sont préparées **chaque matin** dans notre cuisine.

## Quatre incontournables

- **Sauce burger maison** : mayonnaise montée minute, oignon doux, cornichon, paprika fumé
- **BBQ fumée** : mélasse, vinaigre de cidre, sirop d'érable, épices torréfiées
- **Cheddar fondu** : vrai cheddar affiné, lait entier, une pointe de moutarde
- **Moutarde-miel** : miel d'oranger, moutarde à l'ancienne, vinaigre balsamique

## Pas de conservateurs

Aucun additif. Aucun colorant. Aucun arôme artificiel. Juste des ingrédients qu'on reconnaît.

C'est plus de travail. Mais ça se goûte.`,
    cover: 'blog[2]',
  },
];

// ── 3. Helpers Storage (REST API Supabase) ────────────────────────────
async function uploadImage(buffer, contentType, key) {
  const url = `${SUPABASE_URL}/storage/v1/object/restaurant-images/${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload ${key} échoué (${res.status}) : ${txt}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/${key}`;
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YelhaSeed/1)' } });
  if (!res.ok) throw new Error(`Téléchargement ${url} échoué : ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || 'image/jpeg';
  return { buffer: buf, contentType: ct };
}

async function downloadAndUpload(restaurantId, sourceUrl, label) {
  const { buffer, contentType } = await fetchImage(sourceUrl);
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const key = `${restaurantId}/menu/${randomUUID()}.${ext}`;
  const publicUrl = await uploadImage(buffer, contentType, key);
  console.log(`  ✓ ${label.padEnd(22)} → ${publicUrl.split('/').pop()}`);
  return publicUrl;
}

// ── 4. Helper PG ──────────────────────────────────────────────────────
const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function q(sql, params = []) {
  return client.query(sql, params);
}

// ── 5. Seed ───────────────────────────────────────────────────────────
async function main() {
  console.log(`\n→ Connexion à la DB...`);
  await client.connect();

  // 5.1 Garde-fou : déjà créé ?
  const exists = await q(`select id from restaurants where slug=$1`, [SLUG]);
  if (exists.rowCount > 0) {
    console.error(`\n✗ Le slug "${SLUG}" existe déjà. Supprime-le avant de relancer :\n  node scripts/db-apply.mjs --q "delete from restaurants where slug='${SLUG}'"\n`);
    await client.end();
    process.exit(1);
  }

  // 5.2 Crée le owner auth.users (token cols à '' — sinon GoTrue rejette le login)
  console.log(`\n→ Création du owner ${OWNER_EMAIL}...`);
  const ownerId = randomUUID();
  // crypt(password, gen_salt('bf')) = bcrypt natif de pgcrypto
  await q(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
      $2, crypt($3, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    )
  `, [ownerId, OWNER_EMAIL, OWNER_PASSWORD]);

  await q(`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      $1, $1,
      jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true),
      'email', now(), now(), now()
    )
  `, [ownerId, OWNER_EMAIL]);

  // Profile : créé automatiquement par trigger handle_new_user dans l'init schema ;
  // on met juste à jour les colonnes utiles.
  await q(`
    update profiles set role='restaurateur', full_name=$2, is_active=true where id=$1
  `, [ownerId, OWNER_FULL_NAME]);

  // Si le trigger n'existe pas (selon migration), on insert
  const prof = await q(`select id from profiles where id=$1`, [ownerId]);
  if (prof.rowCount === 0) {
    await q(`
      insert into profiles (id, role, full_name, is_active) values ($1, 'restaurateur', $2, true)
    `, [ownerId, OWNER_FULL_NAME]);
  }
  console.log(`  ✓ owner_id = ${ownerId}`);

  // 5.3 Crée le restaurant
  console.log(`\n→ Création du restaurant "${RESTAURANT_NAME}"...`);
  const restoIns = await q(`
    insert into restaurants (
      owner_id, name, slug, description, address, city, phone,
      banner_text, is_open, accept_orders, delivery_fee, min_order,
      estimated_delivery_time, free_delivery_above, status,
      template_id, site_config, home_enabled, blog_enabled
    ) values (
      $1, $2, $3, $4, $5, $6, $7,
      $8, true, true, 150, 800,
      30, 2500, 'active',
      3, $9::jsonb, true, true
    ) returning id
  `, [
    ownerId,
    RESTAURANT_NAME,
    SLUG,
    'Le burger comme on l\'aime : viande maturée, frites fraîches, sauces maison.',
    '12 rue Didouche Mourad',
    'Alger',
    '0555123456',
    '🍔 -10% sur ta première commande avec le code BIENVENUE',
    JSON.stringify({
      hero_title: 'Le burger, version artisanale.',
      hero_subtitle: 'Viande maturée 28 jours, frites coupées le matin, sauces maison. Tout simplement.',
      hero_cta: 'Commander maintenant',
      about_title: 'Notre histoire',
      about_text: 'Burger Paradise est né d\'une obsession : faire le meilleur burger d\'Alger. Pas un fast-food de plus, mais un vrai resto où chaque ingrédient est sourcé avec soin, chaque sauce préparée le matin, chaque steak haché à la commande. On a ouvert en 2022 avec une équipe de 4 passionnés. Aujourd\'hui on est 12, mais on cuisine toujours comme au premier jour.',
      contact_intro: 'Une question, une commande spéciale, un anniversaire à organiser ? On est là pour vous.',
      social: {
        instagram: 'https://instagram.com/burgerparadise',
        facebook: 'https://facebook.com/burgerparadise',
        whatsapp: 'https://wa.me/213555123456',
      },
      highlights: [
        { title: 'Viande maturée', text: '28 jours de maturation pour des arômes incomparables.' },
        { title: 'Frites fraîches', text: 'Bintje, coupée le matin, double cuisson maison.' },
        { title: 'Sauces maison', text: 'Préparées chaque jour par notre chef. Zéro conservateur.' },
      ],
    }),
  ]);
  const restaurantId = restoIns.rows[0].id;
  console.log(`  ✓ restaurant_id = ${restaurantId}`);
  await q(`update profiles set restaurant_id=$1 where id=$2`, [restaurantId, ownerId]);

  // 5.4 Téléchargement + upload des images
  console.log(`\n→ Téléchargement + upload des images...`);
  const heroUrl = await downloadAndUpload(restaurantId, IMG.hero, 'hero');
  const aboutUrl = await downloadAndUpload(restaurantId, IMG.about, 'about');
  const bannerUrl = await downloadAndUpload(restaurantId, IMG.banner, 'banner');
  const galleryUrls = [];
  for (let i = 0; i < IMG.gallery.length; i++) {
    galleryUrls.push(await downloadAndUpload(restaurantId, IMG.gallery[i], `gallery[${i}]`));
  }
  const blogCovers = [];
  for (let i = 0; i < IMG.blog.length; i++) {
    blogCovers.push(await downloadAndUpload(restaurantId, IMG.blog[i], `blog[${i}]`));
  }
  const itemUrls = {};
  for (const [k, u] of Object.entries(IMG.items)) {
    itemUrls[k] = await downloadAndUpload(restaurantId, u, `item:${k}`);
  }

  // 5.5 Mise à jour du restaurant avec les URLs uploadées
  await q(`
    update restaurants
    set banner_image_url=$1,
        site_config = site_config
                    || jsonb_build_object('hero_image_url', $2::text)
                    || jsonb_build_object('about_image_url', $3::text)
                    || jsonb_build_object('gallery', $4::jsonb)
    where id=$5
  `, [bannerUrl, heroUrl, aboutUrl, JSON.stringify(galleryUrls), restaurantId]);

  // 5.6 Horaires d'ouverture (lun-dim, 11h - 23h)
  console.log(`\n→ Horaires d'ouverture (7 jours)...`);
  for (let d = 1; d <= 7; d++) {
    await q(`
      insert into opening_hours (restaurant_id, day_of_week, opens_at, closes_at, is_closed)
      values ($1, $2, '11:00:00', '23:00:00', false)
    `, [restaurantId, d]);
  }
  console.log(`  ✓ ouvert tous les jours 11h–23h`);

  // 5.7 Catégories
  console.log(`\n→ Catégories...`);
  const catIds = {};
  for (const c of CATEGORIES) {
    const r = await q(`
      insert into menu_categories (restaurant_id, name, sort_order, is_visible)
      values ($1, $2, $3, true) returning id
    `, [restaurantId, c.name, c.sort]);
    catIds[c.name] = r.rows[0].id;
    console.log(`  ✓ ${c.name}`);
  }

  // 5.8 Plats + variantes
  console.log(`\n→ Plats (${ITEMS.length}) + variantes...`);
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    const ins = await q(`
      insert into menu_items (
        restaurant_id, category_id, name, description, price, promo_price,
        item_type, is_extra, image_url, is_available, sort_order
      ) values (
        $1, $2, $3, $4, $5, $6,
        'dish', false, $7, true, $8
      ) returning id
    `, [
      restaurantId, catIds[it.cat], it.name, it.desc,
      it.price, it.promo, itemUrls[it.img], i,
    ]);
    const itemId = ins.rows[0].id;
    if (it.variants) {
      for (let j = 0; j < it.variants.length; j++) {
        const v = it.variants[j];
        await q(`
          insert into menu_item_variants (menu_item_id, name, price, is_available, sort_order)
          values ($1, $2, $3, true, $4)
        `, [itemId, v.name, v.price, j]);
      }
    }
    console.log(`  ✓ ${it.name}${it.variants ? ` (${it.variants.length} variantes)` : ''}`);
  }

  // 5.9 Blog posts
  console.log(`\n→ Articles de blog (${BLOG_POSTS.length})...`);
  for (const post of BLOG_POSTS) {
    const idx = Number(post.cover.match(/\d+/)[0]);
    await q(`
      insert into blog_posts (
        restaurant_id, title, slug, excerpt, cover_url, content, status, published_at
      ) values (
        $1, $2, $3, $4, $5, $6, 'published', now()
      )
    `, [restaurantId, post.title, post.slug, post.excerpt, blogCovers[idx], post.content]);
    console.log(`  ✓ ${post.title}`);
  }

  // ── FIN ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║  ✓ SEED DÉMO TERMINÉ                                              ║
╚════════════════════════════════════════════════════════════════════╝

  Restaurant   : ${RESTAURANT_NAME}
  Slug         : ${SLUG}
  Restaurant ID: ${restaurantId}
  Owner ID     : ${ownerId}

  Identifiants restaurateur (pour /login) :
    Email    : ${OWNER_EMAIL}
    Password : ${OWNER_PASSWORD}

  URLs à visiter (après pnpm dev) :
    Site public  : ${appUrl}/r/${SLUG}
    Menu         : ${appUrl}/r/${SLUG}/menu
    Blog         : ${appUrl}/r/${SLUG}/blog
    Contact      : ${appUrl}/r/${SLUG}/contact
    Dashboard    : ${appUrl}/dashboard  (se connecter avec ${OWNER_EMAIL})

  Pour tout supprimer :
    node scripts/db-apply.mjs --q "delete from restaurants where slug='${SLUG}'; delete from auth.users where id='${ownerId}'"
`);

  await client.end();
}

main().catch(async (e) => {
  console.error('\n✗ ÉCHEC:', e.message);
  console.error(e.stack);
  try { await client.end(); } catch {}
  process.exit(1);
});
