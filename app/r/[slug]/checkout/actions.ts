'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/validators/order';
import { sendNewOrderToRestaurateur } from '@/lib/emails/send';

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
  redirectTo?: string;
}

const itemsSchema = z.array(
  z.object({ menu_item_id: z.string().uuid(), quantity: z.number().int().min(1).max(100) }),
);

export async function placeOrderAction(formData: FormData): Promise<CheckoutResult> {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    return { ok: false, error: 'Panier illisible' };
  }
  const itemsParsed = itemsSchema.safeParse(items);
  if (!itemsParsed.success) return { ok: false, error: 'Panier invalide' };

  const parsed = checkoutSchema.safeParse({
    customer_name: formData.get('customer_name'),
    customer_phone: formData.get('customer_phone'),
    customer_address: formData.get('customer_address'),
    notes: formData.get('notes') ?? '',
    items: itemsParsed.data,
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      fieldErrors: {
        customer_name: fe.customer_name?.[0],
        customer_phone: fe.customer_phone?.[0],
        customer_address: fe.customer_address?.[0],
        notes: fe.notes?.[0],
      },
    };
  }

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return { ok: false, error: 'Restaurant invalide' };

  const supabase = await createClient();

  // RPC : crée la commande en transaction, recalcule les prix côté serveur.
  const { data, error } = await supabase.rpc('place_order', {
    p_restaurant_slug: slug,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_customer_address: parsed.data.customer_address,
    p_notes: parsed.data.notes || null,
    p_items: parsed.data.items.map((i) => ({
      menu_item_id: i.menu_item_id,
      quantity: i.quantity,
    })),
  });

  if (error) {
    return { ok: false, error: humanizeRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const orderId = (row as { order_id?: string } | null)?.order_id;
  const orderNumber = (row as { order_number?: string } | null)?.order_number;
  if (!orderId) return { ok: false, error: 'Commande non créée' };

  // Email best-effort au restaurateur (ne bloque pas la redirection client)
  void sendOrderEmailBestEffort(orderId, orderNumber ?? '').catch((e) =>
    console.error('[emails] new order failed', e),
  );

  redirect(`/r/${slug}/confirmation/${orderId}`);
}

async function sendOrderEmailBestEffort(orderId: string, orderNumber: string): Promise<void> {
  try {
    const admin = await createAdminClient();
    const [{ data: order }, { data: items }] = await Promise.all([
      admin
        .from('orders')
        .select('*, restaurant:restaurants(name, owner_id)')
        .eq('id', orderId)
        .maybeSingle(),
      admin
        .from('order_items')
        .select('item_name, quantity, subtotal')
        .eq('order_id', orderId),
    ]);
    if (!order) return;

    type OrderRow = {
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      subtotal: number;
      delivery_fee: number;
      total: number;
      notes: string | null;
      restaurant: { name: string; owner_id: string | null } | null;
    };
    const o = order as unknown as OrderRow;
    const ownerId = o.restaurant?.owner_id;
    if (!ownerId) return;

    const { data: ownerAuth } = await admin.auth.admin.getUserById(ownerId);
    const email = ownerAuth?.user?.email;
    if (!email) return;

    type ItemRow = { item_name: string; quantity: number; subtotal: number };
    const itemRows = (items as unknown as ItemRow[] | null) ?? [];

    await sendNewOrderToRestaurateur({
      to: email,
      restaurantName: o.restaurant?.name ?? 'Votre restaurant',
      order: {
        orderNumber,
        customer: {
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.customer_address,
        },
        items: itemRows.map((i) => ({
          item_name: i.item_name,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
        })),
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        notes: o.notes,
      },
    });
  } catch (e) {
    console.error('[emails] sendOrderEmailBestEffort failed', e);
  }
}

function humanizeRpcError(msg: string): string {
  if (msg.includes('Restaurant indisponible')) return 'Ce restaurant n’accepte pas de commande pour le moment.';
  if (msg.includes('Montant minimum')) return 'Montant minimum de commande non atteint.';
  if (msg.includes('Plat indisponible')) return 'Un des plats n’est plus disponible. Veuillez rafraîchir.';
  if (msg.includes('Téléphone')) return 'Numéro de téléphone invalide.';
  if (msg.includes('Nom')) return 'Nom invalide.';
  if (msg.includes('Adresse')) return 'Adresse invalide.';
  if (msg.includes('Quantité')) return 'Quantité invalide.';
  return 'Impossible de passer la commande. Réessayez.';
}
