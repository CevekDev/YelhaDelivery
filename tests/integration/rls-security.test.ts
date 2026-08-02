import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════
// Tests d'intrusion RLS — vérifient que les correctifs de sécurité de la
// Phase 1 (migration 20260122000000) tiennent réellement côté base.
//
// Ces tests frappent une VRAIE base Supabase (de dev/staging, JAMAIS la prod)
// où la migration Phase 1 est appliquée. Ils s'auto-désactivent si les
// variables d'environnement suivantes ne sont pas définies :
//
//   TEST_SUPABASE_URL          URL du projet Supabase de dev
//   TEST_SUPABASE_ANON_KEY     clé anon du projet
//   TEST_RESTAURATEUR_EMAIL    e-mail d'un compte restaurateur (non-admin)
//   TEST_RESTAURATEUR_PASSWORD son mot de passe
//
// Exécution : définir ces variables puis `pnpm test --run`.
// ═══════════════════════════════════════════════════════════════════

const URL = process.env.TEST_SUPABASE_URL;
const ANON = process.env.TEST_SUPABASE_ANON_KEY;
const EMAIL = process.env.TEST_RESTAURATEUR_EMAIL;
const PASSWORD = process.env.TEST_RESTAURATEUR_PASSWORD;

const configured = Boolean(URL && ANON && EMAIL && PASSWORD);

const randomUuid = () => crypto.randomUUID();

describe.skipIf(!configured)('RLS — intrusion (Phase 1)', () => {
  let client: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    client = createClient(URL as string, ANON as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: EMAIL as string,
      password: PASSWORD as string,
    });
    if (error || !data.user) throw new Error(`Connexion restaurateur de test échouée : ${error?.message}`);
    userId = data.user.id;
  });

  // 1.1 — un restaurateur ne peut pas s'auto-élever en admin.
  it("empêche l'auto-élévation de privilèges (role) sur profiles", async () => {
    // L'UPDATE peut « réussir » (RLS l'autorise sur sa propre ligne) mais le
    // trigger BEFORE UPDATE restaure role à sa valeur d'origine.
    await client.from('profiles').update({ role: 'admin' }).eq('id', userId);

    const { data } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle<{ role: string }>();

    expect(data?.role).toBe('restaurateur');
    expect(data?.role).not.toBe('admin');
  });

  // 1.2 — insertion directe dans orders interdite (contourne place_order).
  it('rejette un INSERT direct dans orders', async () => {
    const { error } = await client.from('orders').insert({
      restaurant_id: randomUuid(),
      customer_name: 'Intrus',
      customer_phone: '0600000000',
      customer_address: 'Rue de test',
      status: 'pending',
    });
    expect(error).not.toBeNull();
  });

  // 1.2 — idem pour order_items.
  it('rejette un INSERT direct dans order_items', async () => {
    const { error } = await client.from('order_items').insert({
      order_id: randomUuid(),
      item_name: 'Intrus',
      item_price: 1,
      quantity: 1,
      subtotal: 1,
    });
    expect(error).not.toBeNull();
  });

  // 1.3 — avis interdit pour une commande non livrée / inexistante.
  it('rejette un avis pour une commande non livrée', async () => {
    const { error } = await client.from('order_reviews').insert({
      order_id: randomUuid(),
      restaurant_id: randomUuid(),
      rating: 5,
      comment: 'Faux avis',
    });
    expect(error).not.toBeNull();
  });
});
