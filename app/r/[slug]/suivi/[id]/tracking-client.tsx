'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

interface PublicOrder {
  id: string;
  order_number: string;
  restaurant_slug: string;
  restaurant_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_address: string;
  total: number;
  created_at: string;
  estimated_delivery_time: number;
}

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

export function TrackingClient({ slug, initial }: { slug: string; initial: PublicOrder }) {
  const [order, setOrder] = useState<PublicOrder>(initial);

  // Poll toutes les 10s — fallback fiable pour les clients anonymes
  // (RLS bloque la souscription Realtime sans session).
  useEffect(() => {
    if (order.status === 'delivered' || order.status === 'cancelled') return;
    const supabase = createClient();
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc('get_public_order', { p_id: order.id });
      const fresh = ((data ?? []) as unknown as PublicOrder[])[0];
      if (fresh) setOrder(fresh);
    }, 10_000);
    return () => clearInterval(interval);
  }, [order.id, order.status]);

  const stepIndex = order.status === 'cancelled' ? -1 : STEPS.indexOf(order.status);

  return (
    <main className="container max-w-xl space-y-6 py-8">
      <div>
        <Link href={`/r/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au menu
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Suivi de commande</h1>
            <p className="font-mono text-sm text-primary-light">{order.order_number}</p>
          </div>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Étapes</CardTitle>
        </CardHeader>
        <CardContent>
          {order.status === 'cancelled' ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Cette commande a été annulée. Contactez {order.restaurant_name} pour en savoir plus.
            </p>
          ) : (
            <ol className="space-y-3">
              {STEPS.map((s, i) => {
                const done = stepIndex >= i;
                const current = stepIndex === i;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span
                      className={
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                        (done
                          ? 'bg-success text-background'
                          : 'border border-border bg-card text-muted-foreground')
                      }
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={
                        current
                          ? 'font-semibold text-foreground'
                          : done
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      }
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <p className="font-semibold">{order.restaurant_name}</p>
          <p className="text-muted-foreground">
            Commandée {formatRelativeTime(order.created_at)} · Livraison estimée ~
            {order.estimated_delivery_time} min
          </p>
          <p className="text-muted-foreground">Adresse : {order.customer_address}</p>
          <p className="font-display text-lg font-bold">{formatPrice(order.total)}</p>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="w-full">
        <Link href={`/r/${slug}`}>Commander à nouveau</Link>
      </Button>
    </main>
  );
}
