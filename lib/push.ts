import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@yelha.net';

export const pushConfigured = Boolean(PUBLIC && PRIVATE);
if (pushConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC as string, PRIVATE as string);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envoie une notification push à tous les abonnements d'un utilisateur.
 * Best-effort : ne lève jamais, no-op si VAPID non configuré.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushConfigured || !userId) return;
  try {
    const admin = await createAdminClient();
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .returns<SubRow[]>();
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (e: unknown) {
          const code = (e as { statusCode?: number }).statusCode;
          // 404/410 → abonnement expiré : on le nettoie
          if (code === 404 || code === 410) {
            await admin.from('push_subscriptions').delete().eq('id', s.id);
          }
        }
      }),
    );
  } catch (e) {
    console.error('[push] sendPushToUser failed', e);
  }
}
