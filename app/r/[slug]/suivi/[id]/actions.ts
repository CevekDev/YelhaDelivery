'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export async function submitReviewAction(
  orderId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; reason?: string }> {
  // Validation défensive : orderId doit être un UUID valide
  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, reason: 'Commande invalide' };
  }
  if (rating < 1 || rating > 5) return { ok: false, reason: 'Note invalide' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_order_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment.trim() || null,
  });
  if (error) return { ok: false, reason: 'Erreur serveur' };
  return data as { ok: boolean; reason?: string };
}
