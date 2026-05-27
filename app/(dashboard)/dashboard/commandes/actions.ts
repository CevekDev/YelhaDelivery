'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';
import { canRestaurateurTransition } from '@/lib/order-status';
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
});

const assignSchema = z.object({
  order_id: z.string().uuid(),
  driver_id: z.string().uuid(),
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

  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data.next_status })
    .eq('id', parsed.data.order_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
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

  const { error } = await supabase
    .from('orders')
    .update({ driver_id: parsed.data.driver_id, status: 'assigned' })
    .eq('id', parsed.data.order_id)
    .eq('restaurant_id', restaurant.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/commandes');
  return { ok: true };
}
