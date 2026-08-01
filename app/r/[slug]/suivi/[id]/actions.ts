'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push';

export async function submitReviewAction(
  orderId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; reason?: string }> {
  // Validation défensive : orderId doit être un UUID valide
  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, reason: 'Commande invalide' };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: 'Note invalide' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_order_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment.trim() || null,
  });
  if (error) return { ok: false, reason: 'Erreur serveur' };
  return data as { ok: boolean; reason?: string };
}

/**
 * Annulation de la commande par le client depuis sa page de suivi.
 * Possible uniquement tant que la commande n'est pas en préparation
 * (contrôlé côté RPC SECURITY DEFINER). En cas de succès, le restaurateur
 * est alerté par notification push (best-effort) — l'alerte in-app est déjà
 * insérée par la RPC.
 */
export async function cancelPublicOrderAction(
  orderId: string,
  reason?: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, reason: 'Commande invalide' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cancel_public_order', {
    p_id: orderId,
    p_reason: reason?.trim() || null,
  });
  if (error) return { ok: false, reason: 'Erreur serveur' };

  const row = ((data ?? []) as unknown as {
    ok: boolean;
    owner_id: string | null;
    order_number: string | null;
  }[])[0];

  if (!row?.ok) {
    return { ok: false, reason: 'Cette commande ne peut plus être annulée.' };
  }

  if (row.owner_id) {
    void sendPushToUser(row.owner_id, {
      title: 'Commande annulée',
      body: `${row.order_number ?? 'Une commande'} a été annulée par le client.`,
      url: '/dashboard/commandes',
      tag: `cancel-${orderId}`,
    });
  }

  return { ok: true };
}
