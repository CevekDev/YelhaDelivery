// =====================================================================
// Attribue des photos Unsplash (licence libre + usage commercial) au menu
// tastycrousty. Stocke les URLs Unsplash CDN directement dans image_url
// (autorisées par next.config.js remotePatterns + CSP img-src).
//
// Idempotent : ne touche que les items qui n'ont pas encore d'image.
// Force réécriture : passer --force
// =====================================================================
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

// ── Charge .env.local ─────────────────────────────────────────────────
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

const FORCE = process.argv.includes('--force');

// ── Mapping item name → photo Unsplash (IDs vérifiés HTTP 200) ────────
const PHOTO_MAP = {
  // ── Crousty (bols poulet pané + riz) ──
  'Crousty Poulet Sauce Blanche': '1626645738196-c2a7c87a8f58',
  'Crousty Poulet Curry': '1585032226651-759b368d7246',
  'Crousty Poulet Mixte (Blanche/Curry)': '1626082927389-6cd097cdc6ec',
  // ── Fritures ──
  'Tenders': '1562967914-608f82629710',
  'Nems x5': '1548013146-72479768bada',
  // ── Desserts ──
  'Tarte au Daim': '1621303837174-89787a7d4729',
  'Misu Fraise': '1631206753348-db44968fd440',
  'Misu Oreo': '1541599540903-216a46ca1dc0',
  'Misu Pistache': '1587049352846-4a222e784d38',
  'Tiramisu Caramel beurre salé': '1571877227200-a0d98ea607e9',
  'Tiramisu Daim': '1616690710400-a16d146927c5',
  // ── Boissons ──
  'Dada Ice Tea Pêche': '1556679343-c7306c1976bc',
  'Dada Mojito': '1551024709-8f23befc6f87',
  'Dada Pomme': '1595981234058-a9302fb97229',
  'Dada Cerise': '1544145945-f90425340c7e',
  'Eau Cristaline': '1616118132534-381148898bb4',
  // ── Sauces ──
  'Sauce Blanche': '1583778176476-4a8b02a64c01',
  'Sauce Curry': '1602253057119-44d745d9b860',
  'Sauce Algérienne': '1607532941433-304659e8198a',
  'Sauce Samouraï': '1608835291093-394b0c943a75',
};

function photoUrl(id) {
  return `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
}

// ── Main ──────────────────────────────────────────────────────────────
const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('→ connecté à la DB');

  const { rows: [resto] } = await client.query(
    "select id, name from public.restaurants where slug='tastycrousty'"
  );
  if (!resto) throw new Error('Restaurant tastycrousty introuvable.');
  console.log(`→ restaurant : ${resto.name} (${resto.id})`);

  const { rows: items } = await client.query(
    `select id, name, image_url
       from public.menu_items
      where restaurant_id = $1
      order by item_type, sort_order`,
    [resto.id],
  );
  console.log(`→ ${items.length} items en base\n`);

  let done = 0;
  let skipped = 0;
  let unmapped = 0;

  for (const item of items) {
    const photoId = PHOTO_MAP[item.name];
    if (!photoId) {
      console.log(`  ⊘ ${item.name.padEnd(38)} — pas de mapping`);
      unmapped++;
      continue;
    }
    if (item.image_url && !FORCE) {
      console.log(`  ⊘ ${item.name.padEnd(38)} — déjà une image (use --force)`);
      skipped++;
      continue;
    }
    const url = photoUrl(photoId);
    await client.query(
      `update public.menu_items set image_url=$1, updated_at=now() where id=$2`,
      [url, item.id],
    );
    console.log(`  ✓ ${item.name.padEnd(38)} → photo-${photoId.slice(0, 12)}…`);
    done++;
  }

  console.log(`\n→ ${done} images assignées · ${skipped} déjà présentes · ${unmapped} sans mapping`);
} catch (e) {
  console.error('✗ FATAL:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
