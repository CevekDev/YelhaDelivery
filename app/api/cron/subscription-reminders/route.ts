import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { computeSubscriptionState, fetchPlatformSettings } from '@/lib/subscription';
import { sendSubscriptionReminder } from '@/lib/emails/send';
import { APP_URL } from '@/lib/seo';
import type { Restaurant } from '@/types/database';

// Rappel « J-3 » : prévient chaque restaurateur 3 jours avant la fin de son
// essai gratuit OU de son abonnement payé. Déclenché quotidiennement par le
// cron Vercel (voir vercel.json). Dé-doublonnage via
// restaurants.expiry_reminder_sent_for : on n'envoie qu'un rappel par échéance.
//
// Sécurité : même garde que /api/cron/cleanup — l'en-tête
//   Authorization: Bearer <CRON_SECRET>
// est injecté par Vercel Cron si CRON_SECRET est défini sur le projet.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REMINDER_DAYS = 3;

type ReminderRow = Pick<
  Restaurant,
  | 'id'
  | 'name'
  | 'owner_id'
  | 'trial_started_at'
  | 'subscription_plan_id'
  | 'subscription_expires_at'
  | 'subscription_lifetime'
  | 'subscription_driver_limit'
> & { expiry_reminder_sent_for: string | null };

function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

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
    const settings = await fetchPlatformSettings(admin);

    // On ne considère que les restos actifs et non « à vie ».
    const { data: rows, error } = await admin
      .from('restaurants')
      .select(
        'id, name, owner_id, trial_started_at, subscription_plan_id, subscription_expires_at, subscription_lifetime, subscription_driver_limit, expiry_reminder_sent_for',
      )
      .eq('status', 'active')
      .eq('subscription_lifetime', false)
      .returns<ReminderRow[]>();

    if (error) {
      console.error('[cron/subscription-reminders] query error', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: { 'cache-control': 'no-store' } },
      );
    }

    const dashboardUrl = `${APP_URL}/dashboard/abonnement`;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const r of rows ?? []) {
      const state = computeSubscriptionState(r, settings);

      const dueNow =
        (state.phase === 'trialing' || state.phase === 'active') &&
        state.until !== null &&
        state.daysLeft === REMINDER_DAYS;
      if (!dueNow || !state.until) {
        continue;
      }

      // Déjà rappelé pour cette échéance ? (dé-doublonnage)
      if (
        r.expiry_reminder_sent_for &&
        new Date(r.expiry_reminder_sent_for).getTime() === new Date(state.until).getTime()
      ) {
        skipped += 1;
        continue;
      }

      if (!r.owner_id) {
        continue;
      }
      const { data: ownerAuth } = await admin.auth.admin.getUserById(r.owner_id);
      const email = ownerAuth?.user?.email;
      if (!email) {
        continue;
      }

      const ok = await sendSubscriptionReminder({
        to: email,
        restaurantName: r.name,
        isTrial: state.phase === 'trialing',
        daysLeft: state.daysLeft,
        endDate: formatDateFr(state.until),
        dashboardUrl,
      });

      if (ok) {
        await admin
          .from('restaurants')
          .update({ expiry_reminder_sent_for: state.until })
          .eq('id', r.id);
        sent += 1;
      } else {
        failed += 1;
      }
    }

    const summary = { ran_at: new Date().toISOString(), sent, skipped, failed };
    console.log('[cron/subscription-reminders] done', summary);
    return NextResponse.json(
      { ok: true, summary },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    console.error('[cron/subscription-reminders] failed', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    );
  }
}
