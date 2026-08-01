'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { canLivreurTransition, CUSTOMER_STATUS_PUSH } from '@/lib/order-status';
import { sendPushToOrder } from '@/lib/push';
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

  // Notification push au client (opt-in) : en route / livrée.
  const push = CUSTOMER_STATUS_PUSH[parsed.data.next_status];
  if (push) {
    const admin = await createAdminClient();
    const { data: r } = await admin
      .from('orders')
      .select('restaurant:restaurants(slug)')
      .eq('id', parsed.data.order_id)
      .maybeSingle<{ restaurant: { slug: string } | { slug: string }[] | null }>();
    const slug = Array.isArray(r?.restaurant) ? r?.restaurant[0]?.slug : r?.restaurant?.slug;
    if (slug) {
      void sendPushToOrder(parsed.data.order_id, {
        ...push,
        url: `/r/${slug}/suivi/${parsed.data.order_id}`,
        tag: `order-status-${parsed.data.order_id}`,
      });
    }
  }

  revalidatePath('/livreur/dashboard');
  revalidatePath('/livreur/historique');
  return { ok: true };
}
