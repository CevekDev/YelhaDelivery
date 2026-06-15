// =====================================================================
// Applique un fichier SQL (ou exécute une requête) sur la base Supabase
// via une connexion Postgres directe. Charge .env.local automatiquement.
//
// Connexion : DATABASE_URL (URI complète) OU PGHOST/PGPASSWORD/PGPORT/PGUSER.
//
// Usages :
//   node scripts/db-apply.mjs supabase/seed.sql      # applique un fichier
//   node scripts/db-apply.mjs --q "select 1"          # exécute et affiche
//
// Le mot de passe n'est jamais affiché.
// =====================================================================
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

// ── Charge .env.local sans rien imprimer ──────────────────────────────
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

const { Client } = pg;
const conn = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || 'postgres',
      ssl: { rejectUnauthorized: false },
    };

if (!process.env.DATABASE_URL && (!conn.host || !conn.password)) {
  console.error('✗ Manque DATABASE_URL (ou PGHOST + PGPASSWORD) dans .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const isQuery = args[0] === '--q';
const sql = isQuery ? args.slice(1).join(' ') : readFileSync(join(process.cwd(), args[0]), 'utf8');
if (!sql || !sql.trim()) {
  console.error('✗ Aucun SQL fourni. Usage: node scripts/db-apply.mjs <fichier.sql> | --q "<requête>"');
  process.exit(1);
}

const client = new Client(conn);
try {
  await client.connect();
  const label = isQuery ? 'requête' : args[0];
  console.log(`→ connecté (${conn.connectionString ? 'DATABASE_URL' : conn.host}). Exécution de ${label}…`);
  const res = await client.query(sql);
  if (isQuery) {
    const rows = Array.isArray(res) ? res.flatMap((r) => r.rows ?? []) : res.rows;
    console.log(JSON.stringify(rows, null, 2));
  }
  console.log('✓ OK');
} catch (e) {
  console.error('✗ ÉCHEC:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
