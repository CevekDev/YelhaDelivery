// =====================================================================
// Définit le compte SUPER ADMIN une fois pour toutes (email + mot de passe).
//
//   - Si l'email existe déjà dans auth.users → met à jour le mot de passe
//     et garantit que le profil est { role: 'admin', is_active: true }.
//   - Sinon → crée l'utilisateur (auth.users + auth.identities + profil admin).
//
// Fonctionne via une connexion Postgres directe (mêmes variables PG* que
// scripts/db-apply.mjs) — pas besoin du service_role key.
//
// Le mot de passe est haché en bcrypt côté DB (pgcrypto). Il n'est jamais
// stocké en clair ni loggé.
//
// USAGE (à lancer TOI-MÊME dans ton terminal — ne partage pas ton mot de passe) :
//
//   Windows PowerShell :
//     $env:ADMIN_EMAIL="ton@email.com"; $env:ADMIN_PASSWORD="TonMotDePasse"; node scripts/set-admin.mjs
//
//   Git Bash / macOS / Linux :
//     ADMIN_EMAIL="ton@email.com" ADMIN_PASSWORD="TonMotDePasse" node scripts/set-admin.mjs
//
// Optionnel : ADMIN_FULL_NAME="Ton Nom" (défaut : "Super Admin").
// =====================================================================
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// ── Charge .env.local (connexion PG) ──────────────────────────────────
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

const EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const FULL_NAME = process.env.ADMIN_FULL_NAME || 'Super Admin';

if (!EMAIL || !PASSWORD) {
  console.error(`
✗ Variables manquantes.

  Lance la commande avec ton email et ton mot de passe, par exemple :

  PowerShell :
    $env:ADMIN_EMAIL="ton@email.com"; $env:ADMIN_PASSWORD="TonMotDePasse"; node scripts/set-admin.mjs
`);
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)) {
  console.error('✗ Email invalide.');
  process.exit(1);
}
if (PASSWORD.length < 8) {
  console.error('✗ Le mot de passe doit faire au moins 8 caractères.');
  process.exit(1);
}

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
  await client.query('begin');

  // Utilisateur déjà présent ?
  const { rows: existing } = await client.query(
    'select id from auth.users where lower(email) = $1 limit 1',
    [EMAIL],
  );

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    // Met à jour le mot de passe (bcrypt) + confirme l'email.
    await client.query(
      `update auth.users
          set encrypted_password = crypt($2, gen_salt('bf')),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              updated_at = now()
        where id = $1`,
      [userId, PASSWORD],
    );
    console.log(`→ Utilisateur existant mis à jour : ${EMAIL}`);
  } else {
    userId = randomUUID();
    // Crée l'utilisateur. Les colonnes token DOIVENT être '' (pas NULL),
    // sinon GoTrue refuse la connexion.
    await client.query(
      `insert into auth.users (
         id, instance_id, aud, role, email, encrypted_password,
         email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
         confirmation_token, recovery_token, email_change_token_new, email_change,
         created_at, updated_at
       ) values (
         $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         $2, crypt($3, gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         $4::jsonb,
         '', '', '', '',
         now(), now()
       )`,
      [userId, EMAIL, PASSWORD, JSON.stringify({ role: 'admin', full_name: FULL_NAME })],
    );
    await client.query(
      `insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
       values ($1, $1, $2, $3::jsonb, 'email', now(), now())`,
      [userId, userId.toString(), JSON.stringify({ sub: userId, email: EMAIL, email_verified: true })],
    );
    console.log(`→ Nouvel utilisateur créé : ${EMAIL}`);
  }

  // Profil admin (upsert).
  await client.query(
    `insert into public.profiles (id, role, full_name, is_active)
     values ($1, 'admin', $2, true)
     on conflict (id) do update
        set role = 'admin', full_name = excluded.full_name, is_active = true`,
    [userId, FULL_NAME],
  );

  await client.query('commit');
  console.log(`\n✓ Compte admin prêt. Connecte-toi sur /admin/login avec :`);
  console.log(`    Email : ${EMAIL}`);
  console.log(`    Mot de passe : (celui que tu viens de définir)`);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('✗ ÉCHEC :', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
