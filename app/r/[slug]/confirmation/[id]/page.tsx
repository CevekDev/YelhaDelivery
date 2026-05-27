import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { CheckCircle2 } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PublicOrder {
  id: string;
  order_number: string;
  restaurant_slug: string;
  restaurant_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  estimated_delivery_time: number;
}

interface PublicOrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase.rpc('get_public_order', { p_id: id }),
    supabase.rpc('get_public_order_items', { p_order_id: id }),
  ]);
  const orderRows = (orderRes.data ?? []) as unknown as PublicOrder[];
  const items = (itemsRes.data ?? []) as unknown as PublicOrderItem[];

  const order = orderRows[0];
  if (!order || order.restaurant_slug !== slug) notFound();

  return (
    <main className="container max-w-xl space-y-6 py-10">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-3 font-display text-2xl font-bold">Commande reçue !</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Numéro <span className="font-mono font-semibold text-primary-light">{order.order_number}</span>
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Statut</CardTitle>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {order.restaurant_name} confirmera votre commande sous peu. Livraison estimée :{' '}
            <strong>~{order.estimated_delivery_time} min</strong>.
          </p>
          <Button asChild className="w-full">
            <Link href={`/r/${slug}/suivi/${order.id}`}>Suivre ma commande en direct</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1">
            <p>{order.customer_name}</p>
            <p className="text-muted-foreground">{order.customer_phone}</p>
            <p className="text-muted-foreground">{order.customer_address}</p>
          </div>
          <ul className="divide-y divide-border border-t border-border pt-3">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between py-2">
                <span>
                  {it.quantity} × {it.item_name}
                </span>
                <span className="tabular-nums">{formatPrice(it.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border pt-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span>
              <span>{formatPrice(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-display text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">💵 Paiement cash à la livraison.</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild variant="ghost">
          <Link href={`/r/${slug}`}>Retour au menu</Link>
        </Button>
      </div>
    </main>
  );
}
