import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { Banknote, CheckCircle2, Clock, Eye, MapPin, Phone } from 'lucide-react';
import { SiteShell } from '@/components/site/site-shell';
import { getTemplate } from '@/lib/templates';
import type { OrderStatus, Restaurant } from '@/types/database';

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
  delivery_fee_set_at: string | null;
}

interface PublicOrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
  note: string | null;
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const [orderRes, itemsRes, restaurantRes] = await Promise.all([
    supabase.rpc('get_public_order', { p_id: id }),
    supabase.rpc('get_public_order_items', { p_order_id: id }),
    supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle<Restaurant>(),
  ]);
  const orderRows = (orderRes.data ?? []) as unknown as PublicOrder[];
  const items = (itemsRes.data ?? []) as unknown as PublicOrderItem[];
  const restaurant = restaurantRes.data;

  const order = orderRows[0];
  if (!order || !restaurant || order.restaurant_slug !== slug) notFound();

  const template = getTemplate(restaurant.template_id);

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <main>
        {/* Hero confirmation — gros check vert */}
        <section className="border-b border-[var(--site-border)]">
          <div className="mx-auto max-w-xl px-4 py-12 text-center md:px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-site-heading)] text-3xl font-extrabold tracking-tight text-[color:var(--site-text)] md:text-4xl">
              Commande confirmée
            </h1>
            <p className="mt-2 text-sm text-[color:var(--site-muted)]">
              Merci {order.customer_name.split(' ')[0]} ! {order.restaurant_name} a bien reçu votre
              commande.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--site-border)] bg-[var(--site-surface)] px-4 py-2">
              <span className="text-xs text-[color:var(--site-muted)]">N°</span>
              <span className="font-mono text-sm font-bold tracking-wider text-[color:var(--site-text)]">
                {order.order_number}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-xl space-y-4 px-4 py-6 md:px-6">
          {/* Suivi */}
          <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
                  Statut actuel
                </p>
                <p className="mt-1 font-[family-name:var(--font-site-heading)] text-lg font-bold text-[color:var(--site-text)]">
                  {ORDER_STATUS_LABELS[order.status]}
                </p>
              </div>
              <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--site-muted)]">
              <Clock className="h-4 w-4 text-[color:var(--site-accent)]" />
              Livraison estimée :{' '}
              <strong className="text-[color:var(--site-text)]">~{order.estimated_delivery_time} min</strong>
            </div>
            <Link
              href={`/r/${slug}/suivi/${order.id}`}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] text-sm font-bold text-[color:var(--site-accent-fg)] transition-opacity hover:opacity-90"
            >
              <Eye className="h-4 w-4" />
              Suivre ma commande en direct
            </Link>
          </div>

          {/* Livraison à */}
          <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
              Livraison à
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-semibold text-[color:var(--site-text)]">{order.customer_name}</p>
              <p className="flex items-start gap-2 text-[color:var(--site-muted)]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--site-accent)]" />
                {order.customer_address}
              </p>
              <p className="flex items-center gap-2 text-[color:var(--site-muted)]">
                <Phone className="h-4 w-4 text-[color:var(--site-accent)]" />
                {order.customer_phone}
              </p>
            </div>
          </div>

          {/* Récap */}
          <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
              Récapitulatif
            </p>
            <ul className="mt-3 divide-y divide-[var(--site-border)]">
              {items.map((it) => (
                <li key={it.id} className="py-2.5 text-sm text-[color:var(--site-text)]">
                  <div className="flex justify-between">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{it.quantity}×</span> {it.item_name}
                    </span>
                    <span className="ml-3 tabular-nums">{formatPrice(it.subtotal)}</span>
                  </div>
                  {it.note && (
                    <p className="mt-0.5 italic text-xs text-[color:var(--site-muted)]">
                      « {it.note} »
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-[var(--site-border)] pt-3 text-sm">
              <div className="flex justify-between text-[color:var(--site-muted)]">
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
              <div className="flex justify-between text-[color:var(--site-muted)]">
                <span>Livraison</span>
                <span className="tabular-nums">
                  {order.delivery_fee_set_at == null ? (
                    <span className="font-medium text-[color:var(--site-accent)]">À confirmer</span>
                  ) : Number(order.delivery_fee) === 0 ? (
                    <span className="font-semibold text-success">Offerte</span>
                  ) : (
                    formatPrice(order.delivery_fee)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--site-border)] pt-2 font-[family-name:var(--font-site-heading)] text-base font-bold text-[color:var(--site-text)]">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(order.total)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-[var(--site-accent)] bg-[var(--site-accent)]/5 p-3 text-sm text-[color:var(--site-text)]">
              <Banknote className="h-5 w-5 shrink-0 text-[color:var(--site-accent)]" />
              <span>
                {order.delivery_fee_set_at == null ? (
                  <>
                    Le restaurant va confirmer les <strong>frais de livraison</strong>. Suivez votre
                    commande pour voir le total final à payer en espèces.
                  </>
                ) : (
                  <>
                    <strong>Payez {formatPrice(order.total)}</strong> en espèces à la livraison.
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link
              href={`/r/${slug}/menu`}
              className="text-sm text-[color:var(--site-muted)] hover:text-[color:var(--site-text)]"
            >
              ← Retour au menu de {order.restaurant_name}
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
