// One-off: bascule tous les restaurants en status=pending vers status=active.
// Utile après suppression de la modération (signups antérieurs restaient bloqués).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: pending, error: selErr } = await supabase
  .from('restaurants')
  .select('id, name, slug')
  .eq('status', 'pending');

if (selErr) {
  console.error('Select failed:', selErr.message);
  process.exit(1);
}

if (!pending || pending.length === 0) {
  console.log('No pending restaurants. Done.');
  process.exit(0);
}

console.log(`Found ${pending.length} pending restaurant(s):`);
for (const r of pending) console.log(`  - ${r.name} (/r/${r.slug})`);

const { error: updErr } = await supabase
  .from('restaurants')
  .update({ status: 'active' })
  .eq('status', 'pending');

if (updErr) {
  console.error('Update failed:', updErr.message);
  process.exit(1);
}

console.log(`Activated ${pending.length} restaurant(s).`);
