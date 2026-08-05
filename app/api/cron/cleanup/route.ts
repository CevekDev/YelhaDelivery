import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Purge de rétention (60 jours), déclenchée quotidiennement par le cron Vercel
// (voir vercel.json). Appelle la fonction SQL public.cleanup_expired_data() via
// le service_role : supprime les commandes de +60 j et les comptes bannis
// (restaurants suspendus / utilisateurs désactivés) 60 j après le bannissement.
//
// Sécurité : Vercel Cron injecte automatiquement l'en-tête
//   Authorization: Bearer <CRON_SECRET>
// si la variable d'environnement CRON_SECRET est définie sur le projet. On
// refuse toute requête dont le jeton ne correspond pas.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET non configuré sur le serveur' },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    );
  }

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: 'Non autorisé' },
      { status: 401, headers: { 'cache-control': 'no-store' } },
    );
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc('cleanup_expired_data');
    if (error) {
      console.error('[cron/cleanup] RPC error', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: { 'cache-control': 'no-store' } },
      );
    }
    console.log('[cron/cleanup] done', data);
    return NextResponse.json(
      { ok: true, summary: data },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    console.error('[cron/cleanup] failed', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    );
  }
}
