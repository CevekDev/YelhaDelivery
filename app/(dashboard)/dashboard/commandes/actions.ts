'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { canRestaurateurTransition, CUSTOMER_STATUS_PUSH } from '@/lib/order-status';
import { sendPushToOrder, sendPushToUser } from '@/lib/push';
import type { OrderStatus } from '@/types/database';

const updateSchema = z.object({
  order_id: z.string().uuid(),
  next_status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'assigned',
    'on_the_way',
    'delivered',
    'cancelled',
  ]),
  cancellation_reason: z.string().max(500).optional(),
});

const assignSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
});

const deliveryFeeSchema = z.object({
  order_id: z.string().uuid(),
  delivery_fee: z.coerce.number().min(0).max(100000),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateOrderStatusAction(formData: FormData): Promise<ActionResult> {
  const { restaurant } = await requireRestaurateur();
  const parsed = updateSchema.safeParse({
    order_id: formData.get('order_id'),
    next_status: formData.get('next_status'),
    cancellation_reason: formData.get('cancellation_reason') ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: 'Requête invalide' };

  const supabase = await createClient();

  // Lecture sécurisée : RLS garantit déjà restaurant_id, mais on vérifie la transition.
  const { data: current } = await supabase
    .from('orders')
    .select('status, restaurant_id')
    .eq('id', parsed.data.order_id)
    .maybeSingle<{ status: OrderStatus; restaurant_id: string }>();

  if (!current || current.restaurant_id !== restaurant.id) {
    return { ok: false, error: 'Commande introuvable' };
  }

  // Annulation toujours possible (sauf si déjà livrée)
  const isCancel = parsed.data.next_status === 'cancelled';
  if (!isCancel && !canRestaurateurTransition(current.status, parsed.data.next_status)) {
    return { ok: false, error: `Transition ${current.status} → ${parsed.data.next_status} interdite` };
  }
  if (current.status === 'delivered') {
    return { ok: false, error: 'Commande déjà livrée' };
  }

  const updatePayload: Record<string, unknown> = { status: parsed.data.next_status };
  if (parsed.data.next_status === 'cancelled' && parsed.data.cancellation_reason?.trim()) {
    updatePayload.cancellation_reason = parsed.data.cancellation_reason.trim();
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', parsed.data.order_id)
    .eq('restaurant_id', restaurant.id);

  if (error) return { ok: false, error: error.message };

  // Notification push au client (opt-in) sur les statuts clés.
  const push = CUSTOMER_STATUS_PUSH[parsed.data.next_status];
  if (push) {
    void sendPushToOrder(parsed.data.order_id, {
      ...push,
      url: `/r/${restaurant.slug}/suivi/${parsed.data.order_id}`,
      tag: `order-status-${parsed.data.order_id}`,
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/commandes');
  return { ok: true };
}

/**
 * Fixe (ou met à jour) le prix de livraison d'une commande, saisi manuellement
 * par le restaurateur — le montant dépend en général du quartier du client.
 * Recalcule le total (sous-total − remise + livraison) et marque
 * delivery_fee_set_at, ce qui déclenche l'affichage côté client (page de suivi).
 * RLS : seul le restaurateur propriétaire peut modifier ses commandes.
 */
export async function setDeliveryFeeAction(formData: FormData): Promise<ActionResult> {
  const { restaurant } = await requireRestaurateur();
  const parsed = deliveryFeeSchema.safeParse({
    order_id: formData.get('order_id'),
    delivery_fee: formData.get('delivery_fee'),
  });
  if (!parsed.success) return { ok: false, error: 'Montant invalide' };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from('orders')
    .select('status, restaurant_id, subtotal, discount_amount')
    .eq('id', parsed.data.order_id)
    .maybeSingle<{
      status: OrderStatus;
      restaurant_id: string;
      subtotal: number;
      discount_amount: number;
    }>();

  if (!current || current.restaurant_id !== restaurant.id) {
    return { ok: false, error: 'Commande introuvable' };
  }
  if (current.status === 'delivered' || current.status === 'cancelled') {
    return { ok: false, error: 'Commande clôturée' };
  }

  const fee = parsed.data.delivery_fee;
  const total = Math.max(0, Number(current.subtotal) - Number(current.discount_amount)) + fee;

  const { error } = await supabase
    .from('orders')
    .update({
      delivery_fee: fee,
      delivery_fee_set_at: new Date().toISOString(),
      total,
    })
    .eq('id', parsed.data.order_id)
    .eq('restaurant_id', restaurant.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/commandes');
  return { ok: true };
}

export async function assignDriverAction(formData: FormData): Promise<ActionResult> {
  const { restaurant } = await requireRestaurateur();
  const parsed = assignSchema.safeParse({
    order_id: formData.get('order_id'),
    driver_id: formData.get('driver_id'),
  });
  if (!parsed.success) return { ok: false, error: 'Requête invalide' };

  const supabase = await createClient();

  // Vérifier que le livreur appartient au même restaurant
  const { data: driver } = await supabase
    .from('profiles')
    .select('id, restaurant_id, role, is_active')
    .eq('id', parsed.data.driver_id)
    .maybeSingle<{ id: string; restaurant_id: string | null; role: string; is_active: boolean }>();

  if (
    !driver ||
    driver.role !== 'livreur' ||
    driver.restaurant_id !== restaurant.id ||
    !driver.is_active
  ) {
    return { ok: false, error: 'Livreur invalide' };
  }

  // Garde-fou : ne pas (ré)assigner une commande déjà clôturée.
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', parsed.data.order_id)
    .eq('restaurant_id', restaurant.id)
    .maybeSingle<{ status: OrderStatus }>();
  if (!order) return { ok: false, error: 'Commande introuvable' };
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { ok: false, error: 'Commande déjà clôturée' };
  }

  const { error } = await supabase
    .from('orders')
    .update({ driver_id: parsed.data.driver_id, status: 'assigned' })
    .eq('id', parsed.data.order_id)
    .eq('restaurant_id', restaurant.id);

  if (error) return { ok: false, error: error.message };

  // Notification push au livreur (best-effort)
  void sendPushToUser(parsed.data.driver_id, {
    title: 'Nouvelle course',
    body: 'Une commande vous a été assignée.',
    url: '/livreur/dashboard',
    tag: `assign-${parsed.data.order_id}`,
  });

  revalidatePath('/dashboard/commandes');
  return { ok: true };
}
