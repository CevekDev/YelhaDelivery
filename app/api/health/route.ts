import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Endpoint santé léger qui EFFECTUE une requête sur la base → garde le projet
// Supabase « actif » et évite la mise en pause du free tier (déclenchée après
// ~7 j sans activité). Pingé quotidiennement par .github/workflows/keepalive.yml.
// Bonus : renvoie 503 si la base ne répond pas → l'Action échoue et te notifie.
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: 'config manquante' },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // Requête triviale (compte, sans données) : suffit à marquer l'activité.
    const { error } = await supabase.from('restaurants').select('id', { count: 'exact', head: true });
    return NextResponse.json(
      { ok: !error, ts: new Date().toISOString() },
      { status: error ? 503 : 200, headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
