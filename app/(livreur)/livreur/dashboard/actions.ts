'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { canLivreurTransition } from '@/lib/order-status';
import type { OrderStatus } from '@/types/database';

const updateSchema = z.object({
  order_id: z.string().uuid(),
  next_status: z.enum(['on_the_way', 'delivered']),
});

export interface LivreurActionResult {
  ok: boolean;
  error?: string;
}

export async function livreurUpdateOrderAction(formData: FormData): Promise<LivreurActionResult> {
  const { userId } = await requireRole('livreur');
  const parsed = updateSchema.safeParse({
    order_id: formData.get('order_id'),
    next_status: formData.get('next_status'),
  });
  if (!parsed.success) return { ok: false, error: 'Requête invalide' };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from('orders')
    .select('status, driver_id')
    .eq('id', parsed.data.order_id)
    .maybeSingle<{ status: OrderStatus; driver_id: string | null }>();

  if (!current || current.driver_id !== userId) {
    return { ok: false, error: 'Commande introuvable' };
  }
  if (!canLivreurTransition(current.status, parsed.data.next_status)) {
    return {
      ok: false,
      error: `Transition ${current.status} → ${parsed.data.next_status} interdite`,
    };
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data.next_status })
    .eq('id', parsed.data.order_id)
    .eq('driver_id', userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/livreur/dashboard');
  revalidatePath('/livreur/historique');
  return { ok: true };
}
