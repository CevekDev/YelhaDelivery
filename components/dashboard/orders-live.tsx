'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
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
import { X } from 'lucide-react';

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
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCancel = () => {
    const fd = new FormData();
    fd.set('order_id', order.id);
    fd.set('next_status', 'cancelled');
    if (cancelReason.trim()) fd.set('cancellation_reason', cancelReason.trim());
    startTransition(async () => {
      const res = await updateOrderStatusAction(fd);
      if (!res.ok) {
        setActionError(res.error ?? 'Action impossible');
        return;
      }
      setActionError(null);
      setCancelModal(false);
      setCancelReason('');
    });
  };

  return (
    <>
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
              {order.cancellation_reason && (
                <p className="mt-1 text-xs text-destructive">
                  Annulation : {order.cancellation_reason}
                </p>
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
                .filter((s) => s !== 'assigned' && s !== 'cancelled')
                .map((s) => (
                  <form
                    key={s}
                    action={(fd) =>
                      startTransition(async () => {
                        fd.set('order_id', order.id);
                        fd.set('next_status', s);
                        const res = await updateOrderStatusAction(fd);
                        setActionError(res.ok ? null : res.error ?? 'Action impossible');
                      })
                    }
                  >
                    <Button type="submit" size="sm" disabled={disabled}>
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  </form>
                ))}

              {/* Bouton annuler — ouvre modal */}
              {next.includes('cancelled') && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => setCancelModal(true)}
                >
                  {ORDER_STATUS_LABELS['cancelled']}
                </Button>
              )}

              {/* Assigner livreur */}
              {(order.status === 'preparing' || order.status === 'confirmed' || order.status === 'assigned') &&
                drivers.length > 0 && (
                  <form
                    action={(fd) =>
                      startTransition(async () => {
                        fd.set('order_id', order.id);
                        const res = await assignDriverAction(fd);
                        setActionError(res.ok ? null : res.error ?? 'Action impossible');
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

              {actionError && (
                <p className="w-full text-xs text-destructive">{actionError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'annulation */}
      {cancelModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setCancelModal(false)}
            aria-hidden
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Annuler la commande</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.order_number} · {order.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">
                Raison d&apos;annulation{' '}
                <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ex: Stock épuisé, restaurant fermé, etc."
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={disabled}
                onClick={handleCancel}
              >
                Confirmer l&apos;annulation
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCancelModal(false);
                  setCancelReason('');
                }}
              >
                Retour
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
