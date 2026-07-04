// =====================================================================
// Lie les 4 sauces comme extras optionnels aux 3 Crousty (bols poulet)
// pour que la modale extras s'affiche lors du clic sur ces plats.
// La sauce déjà incluse dans le plat est marquée is_free=true (offerte).
// Idempotent (ON CONFLICT DO NOTHING).
// =====================================================================
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

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

// Nom de la sauce incluse dans chaque Crousty → sera marquée gratuite
const INCLUDED_SAUCE = {
  'Crousty Poulet Sauce Blanche': ['Sauce Blanche'],
  'Crousty Poulet Curry': ['Sauce Curry'],
  'Crousty Poulet Mixte (Blanche/Curry)': ['Sauce Blanche', 'Sauce Curry'],
};

const ALL_SAUCE_NAMES = ['Sauce Blanche', 'Sauce Curry', 'Sauce Algérienne', 'Sauce Samouraï'];

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
  console.log('→ connecté');

  const { rows: [resto] } = await client.query(
    "select id from public.restaurants where slug='tastycrousty'"
  );
  if (!resto) throw new Error('resto introuvable');

  const { rows: sauces } = await client.query(
    `select id, name from public.menu_items where restaurant_id=$1 and item_type='sauce'`,
    [resto.id],
  );
  const sauceByName = Object.fromEntries(sauces.map((s) => [s.name, s.id]));
  for (const n of ALL_SAUCE_NAMES) {
    if (!sauceByName[n]) throw new Error(`Sauce "${n}" introuvable en base`);
  }

  let linked = 0;
  for (const [dishName, freeList] of Object.entries(INCLUDED_SAUCE)) {
    const { rows: [dish] } = await client.query(
      `select id from public.menu_items where restaurant_id=$1 and name=$2`,
      [resto.id, dishName],
    );
    if (!dish) {
      console.log(`  ⊘ ${dishName} — plat introuvable`);
      continue;
    }
    for (const sauceName of ALL_SAUCE_NAMES) {
      const isFree = freeList.includes(sauceName);
      const res = await client.query(
        `insert into public.menu_item_extras (menu_item_id, extra_item_id, is_free)
         values ($1, $2, $3)
         on conflict (menu_item_id, extra_item_id) do update set is_free = excluded.is_free
         returning menu_item_id`,
        [dish.id, sauceByName[sauceName], isFree],
      );
      if (res.rowCount) {
        console.log(`  ✓ ${dishName.padEnd(40)} + ${sauceName.padEnd(20)} ${isFree ? '(offerte)' : '(payante)'}`);
        linked++;
      }
    }
  }

  console.log(`\n→ ${linked} liens créés/mis à jour`);
} catch (e) {
  console.error('✗ FATAL:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
