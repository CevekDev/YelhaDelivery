import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { Banknote, CheckCircle2, Clock, Eye, MapPin, Phone } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Commande confirmée' };

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
  discount_amount: number;
  promo_code: string | null;
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
    <main className="min-h-screen bg-muted/30">
      {/* Hero confirmation — gros check vert */}
      <section className="border-b border-border bg-background">
        <div className="container max-w-xl py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Commande confirmée
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Merci {order.customer_name.split(' ')[0]} ! {order.restaurant_name} a bien reçu votre
            commande.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <span className="text-xs text-muted-foreground">N°</span>
            <span className="font-mono text-sm font-bold tracking-wider">
              {order.order_number}
            </span>
          </div>
        </div>
      </section>

      <section className="container max-w-xl space-y-4 py-6">
        {/* Suivi */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Statut actuel
              </p>
              <p className="mt-1 font-display text-lg font-bold">
                {ORDER_STATUS_LABELS[order.status]}
              </p>
            </div>
            <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Livraison estimée :{' '}
            <strong className="text-foreground">~{order.estimated_delivery_time} min</strong>
          </div>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={`/r/${slug}/suivi/${order.id}`}>
              <Eye className="h-4 w-4" />
              Suivre ma commande en direct
            </Link>
          </Button>
        </div>

        {/* Livraison à */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Livraison à
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-semibold">{order.customer_name}</p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {order.customer_address}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              {order.customer_phone}
            </p>
          </div>
        </div>

        {/* Récap */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Récapitulatif
          </p>
          <ul className="mt-3 divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{it.quantity}×</span> {it.item_name}
                </span>
                <span className="ml-3 tabular-nums">{formatPrice(it.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && order.promo_code && (
              <div className="flex justify-between text-success">
                <span>
                  Réduction (<code className="font-mono">{order.promo_code}</code>)
                </span>
                <span className="tabular-nums">−{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span>
              <span className="tabular-nums">
                {order.delivery_fee === 0 ? (
                  <span className="font-semibold text-success">Offerte</span>
                ) : (
                  formatPrice(order.delivery_fee)
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-3 text-sm">
            <Banknote className="h-5 w-5 shrink-0 text-primary" />
            <span>
              <strong>Payez {formatPrice(order.total)}</strong> en espèces à la livraison.
            </span>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link
            href={`/r/${slug}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au menu de {order.restaurant_name}
          </Link>
        </div>
      </section>
    </main>
  );
}
