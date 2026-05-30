// One-off: applique les migrations SQL au projet Supabase via connexion Postgres directe.
// Usage : node scripts/run-migrations.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const HOST = process.env.PGHOST;
const PASSWORD = process.env.PGPASSWORD;
const USER = process.env.PGUSER || 'postgres';
const PORT = Number(process.env.PGPORT || 5432);
const DB = process.env.PGDATABASE || 'postgres';

if (!HOST || !PASSWORD) {
  console.error('Missing PGHOST or PGPASSWORD env vars.');
  process.exit(1);
}

const client = new Client({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  database: DB,
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`Connecting to ${HOST}:${PORT} as ${USER}...`);
await client.connect();
console.log('Connected.');

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  console.log(`\n[migration] ${file} (${sql.length} chars)`);
  try {
    await client.query(sql);
    console.log(`[migration] ${file} OK`);
  } catch (e) {
    console.error(`[migration] ${file} FAILED:`, e.message);
    await client.end();
    process.exit(1);
  }
}

console.log('\nAll migrations applied.');
await client.end();
