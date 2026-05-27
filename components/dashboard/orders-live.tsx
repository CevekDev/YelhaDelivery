'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  RESTAURATEUR_TRANSITIONS,
} from '@/lib/order-status';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { assignDriverAction, updateOrderStatusAction } from '@/app/(dashboard)/dashboard/commandes/actions';
import type { Order, OrderStatus, Profile } from '@/types/database';

interface Props {
  restaurantId: string;
  initialOrders: Order[];
  drivers: Pick<Profile, 'id' | 'full_name' | 'username'>[];
}

export function OrdersLive({ restaurantId, initialOrders, drivers }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<'active' | 'all' | OrderStatus>('active');
  const [isPending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Beep généré dynamiquement via WebAudio (pas besoin de fichier).
  const playBeep = useCallback(() => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore (autoplay restrictions before user interaction)
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders-restaurant-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
          playBeep();
          router.refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, router, playBeep]);

  const visible = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active')
      return !['delivered', 'cancelled'].includes(o.status);
    return o.status === filter;
  });

  return (
    <div className="space-y-4">
      <audio ref={audioRef} preload="none" />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {(['active', 'all', 'pending', 'preparing', 'on_the_way', 'delivered'] as const).map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? 'En cours' : f === 'all' ? 'Toutes' : ORDER_STATUS_LABELS[f]}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune commande dans ce filtre.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} drivers={drivers} disabled={isPending} startTransition={startTransition} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({
  order,
  drivers,
  disabled,
  startTransition,
}: {
  order: Order;
  drivers: Pick<Profile, 'id' | 'full_name' | 'username'>[];
  disabled: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const next = RESTAURATEUR_TRANSITIONS[order.status] ?? [];

  return (
    <Card className="animate-fade-in">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-primary-light">{order.order_number}</p>
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(order.created_at)} ·{' '}
              <a href={`tel:${order.customer_phone}`} className="hover:text-foreground">
                {order.customer_phone}
              </a>
            </p>
            <p className="text-xs text-muted-foreground">{order.customer_address}</p>
            {order.notes && (
              <p className="mt-1 text-xs italic text-muted-foreground">« {order.notes} »</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <p className="font-display text-lg font-bold">{formatPrice(order.total)}</p>
          </div>
        </div>

        {/* Actions */}
        {!['delivered', 'cancelled'].includes(order.status) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {next
              .filter((s) => s !== 'assigned') // l'assignation passe par le select livreur ci-dessous
              .map((s) => (
                <form
                  key={s}
                  action={(fd) =>
                    startTransition(async () => {
                      fd.set('order_id', order.id);
                      fd.set('next_status', s);
                      await updateOrderStatusAction(fd);
                    })
                  }
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant={s === 'cancelled' ? 'destructive' : 'default'}
                    disabled={disabled}
                  >
                    {ORDER_STATUS_LABELS[s]}
                  </Button>
                </form>
              ))}

            {/* Assigner livreur */}
            {(order.status === 'preparing' || order.status === 'confirmed' || order.status === 'assigned') &&
              drivers.length > 0 && (
                <form
                  action={(fd) =>
                    startTransition(async () => {
                      fd.set('order_id', order.id);
                      await assignDriverAction(fd);
                    })
                  }
                  className="flex items-center gap-2"
                >
                  <select
                    name="driver_id"
                    defaultValue={order.driver_id ?? ''}
                    required
                    className="h-9 rounded-md border border-border bg-input px-2 text-xs"
                  >
                    <option value="" disabled>
                      Assigner à…
                    </option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name || d.username}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" disabled={disabled}>
                    Assigner
                  </Button>
                </form>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
