// One-off : marque les migrations déjà appliquées dans la table _migrations.
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  create table if not exists public._migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
`);

const files = [
  '20260101000000_initial_schema.sql',
  '20260102000000_public_order_lookup.sql',
  '20260103000000_fix_current_restaurant_id.sql',
];

for (const f of files) {
  await client.query(
    'insert into public._migrations (filename) values ($1) on conflict do nothing',
    [f],
  );
  console.log(`marked: ${f}`);
}

await client.end();
console.log('Done.');
