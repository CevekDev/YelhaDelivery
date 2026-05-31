// One-shot : applique UNE migration SQL spécifique passée en argument.
// Usage : node scripts/run-one-migration.mjs <filename>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-one-migration.mjs <filename>');
  process.exit(1);
}

const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', file), 'utf-8');

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Applying ${file}…`);
try {
  await client.query(sql);
  console.log('Done.');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
