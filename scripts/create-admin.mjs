// One-off: crée le compte super admin via Supabase Auth Admin API + insère le profil.
// Usage : node scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const FULL_NAME = process.env.ADMIN_FULL_NAME || 'Super Admin';

if (!SUPABASE_URL || !SERVICE_ROLE || !EMAIL || !PASSWORD) {
  console.error('Missing env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. Vérifier que l'utilisateur n'existe pas déjà
const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const already = existing?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

let userId;
if (already) {
  console.log(`User ${EMAIL} exists (id=${already.id}). Skipping auth creation.`);
  userId = already.id;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });
  if (error || !data?.user) {
    console.error('Auth user creation failed:', error?.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`Created auth user ${EMAIL} (id=${userId}).`);
}

// 2. Upsert le profil admin
const { error: profileErr } = await supabase.from('profiles').upsert(
  {
    id: userId,
    role: 'admin',
    full_name: FULL_NAME,
    is_active: true,
  },
  { onConflict: 'id' },
);

if (profileErr) {
  console.error('Profile upsert failed:', profileErr.message);
  process.exit(1);
}

console.log(`Admin profile ready for ${EMAIL}. Done.`);
