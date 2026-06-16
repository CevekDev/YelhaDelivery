'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

export interface PushResult {
  ok: boolean;
  error?: string;
}

/** Enregistre l'abonnement push de l'utilisateur connecté. */
export async function savePushSubscription(input: unknown): Promise<PushResult> {
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Abonnement invalide' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Supprime un abonnement (désactivation). */
export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
