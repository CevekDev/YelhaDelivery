// =====================================================================
// Définit un compte SUPER ADMIN (identifiant + mot de passe) — fallback CLI.
//
// L'admin se connecte sur /admin/login par IDENTIFIANT (username), mappé en
// interne vers `<username>@admin.yelha.net`. Ce script crée/actualise ce compte.
//
//   - username déjà présent → met à jour le mot de passe + profil admin actif
//   - sinon → crée auth.users + auth.identities + profil admin
//
// Connexion Postgres directe (mêmes PG* que scripts/db-apply.mjs) — pas besoin
// du service_role. Mot de passe haché en bcrypt côté DB, jamais loggé.
//
// USAGE (à lancer toi-même) :
//   PowerShell :
//     $env:ADMIN_USERNAME="mehdi"; $env:ADMIN_PASSWORD="MotDePasse"; node scripts/set-admin.mjs
//   Git Bash / macOS / Linux :
//     ADMIN_USERNAME="mehdi" ADMIN_PASSWORD="MotDePasse" node scripts/set-admin.mjs
//
// Optionnel : ADMIN_FULL_NAME="Ton Nom" (défaut : "Super Admin").
//
// NB : le plus simple est de gérer identifiant + mot de passe directement
// depuis le panel : /admin/parametres.
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

const USERNAME = (process.env.ADMIN_USERNAME || '').trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const FULL_NAME = process.env.ADMIN_FULL_NAME || 'Super Admin';
const SYNTH_DOMAIN = '@admin.yelha.net';

if (!USERNAME || !PASSWORD) {
  console.error(`
✗ Variables manquantes.

  PowerShell :
    $env:ADMIN_USERNAME="mehdi"; $env:ADMIN_PASSWORD="MotDePasse"; node scripts/set-admin.mjs
`);
  process.exit(1);
}
if (!/^[a-z0-9_]{3,32}$/.test(USERNAME)) {
  console.error('✗ Identifiant invalide (lettres minuscules, chiffres, _, 3–32 caractères).');
  process.exit(1);
}
if (PASSWORD.length < 4) {
  console.error('✗ Le mot de passe doit faire au moins 4 caractères.');
  process.exit(1);
}

const email = `${USERNAME}${SYNTH_DOMAIN}`;
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

  const { rows: existing } = await client.query(
    'select id from auth.users where lower(email) = $1 limit 1',
    [email],
  );

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    await client.query(
      `update auth.users
          set encrypted_password = crypt($2, gen_salt('bf')),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              updated_at = now()
        where id = $1`,
      [userId, PASSWORD],
    );
    console.log(`→ Compte existant mis à jour : ${USERNAME}`);
  } else {
    const { rows } = await client.query('select gen_random_uuid() as id');
    userId = rows[0].id;
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
         $4::jsonb, '', '', '', '', now(), now()
       )`,
      [userId, email, PASSWORD, JSON.stringify({ role: 'admin', full_name: FULL_NAME })],
    );
    await client.query(
      `insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
       values ($1, $1, $2, $3::jsonb, 'email', now(), now())`,
      [userId, userId.toString(), JSON.stringify({ sub: userId, email, email_verified: true })],
    );
    console.log(`→ Nouveau compte admin créé : ${USERNAME}`);
  }

  await client.query(
    `insert into public.profiles (id, role, full_name, username, is_active)
     values ($1, 'admin', $2, $3, true)
     on conflict (id) do update
        set role = 'admin', full_name = excluded.full_name, username = excluded.username, is_active = true`,
    [userId, FULL_NAME, USERNAME],
  );

  await client.query('commit');
  console.log(`\n✓ Prêt. Connecte-toi sur /admin/login avec l'identifiant « ${USERNAME} ».`);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('✗ ÉCHEC :', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
