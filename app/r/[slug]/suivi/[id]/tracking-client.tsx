'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import {
  Check,
  ChefHat,
  CheckCircle2,
  Clock,
  PackageCheck,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';
import { submitReviewAction } from './actions';
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
  cancellation_reason: string | null;
}

const STEPS: { key: OrderStatus; label: string; icon: typeof Check }[] = [
  { key: 'pending', label: 'Reçue', icon: Check },
  { key: 'confirmed', label: 'Confirmée', icon: CheckCircle2 },
  { key: 'preparing', label: 'En préparation', icon: ChefHat },
  { key: 'on_the_way', label: 'En route', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: PackageCheck },
];

/* ─── Formulaire d'avis ─── */
function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-center shadow-card">
        <p className="font-display text-lg font-bold text-success">Merci pour votre avis !</p>
        <p className="mt-1 text-sm text-muted-foreground">Votre retour aide le restaurant à s&apos;améliorer.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
      <p className="font-display text-base font-bold">Donnez votre avis</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Partagez votre expérience en quelques secondes.</p>

      {/* Stars */}
      <div className="mt-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                i <= (hovered || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-muted text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Votre commentaire (optionnel)"
        className="mt-4 w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <Button
        type="button"
        className="mt-3 w-full"
        disabled={rating === 0 || isPending}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await submitReviewAction(orderId, rating, comment);
            if (res.ok) {
              setSubmitted(true);
            } else {
              setError(res.reason ?? 'Erreur lors de l\'envoi');
            }
          });
        }}
      >
        {isPending ? 'Envoi…' : 'Envoyer l\'avis'}
      </Button>
    </div>
  );
}

/* ─── Tracking principal ─── */
export function TrackingClient({ slug, initial }: { slug: string; initial: PublicOrder }) {
  const [order, setOrder] = useState<PublicOrder>(initial);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

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

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  const createdMs = new Date(order.created_at).getTime();
  const etaMs = createdMs + order.estimated_delivery_time * 60_000;
  const remainingMin = Math.max(0, Math.round((etaMs - now) / 60_000));

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container max-w-xl py-5">
          <Link href={`/r/${slug}/menu`} className="text-xs text-muted-foreground hover:text-foreground">
            ← Retour au menu
          </Link>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Suivi en direct
              </p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">
                {order.restaurant_name}
              </h1>
              <p className="mt-1 font-mono text-xs text-primary">{order.order_number}</p>
            </div>
            <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
        </div>
      </header>

      <section className="container max-w-xl space-y-4 py-6">
        {/* Big ETA card */}
        {!isCancelled && !isDelivered && (
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Arrivée estimée
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="font-display text-5xl font-extrabold tracking-tight tabular-nums">
                {remainingMin}
              </p>
              <p className="font-display text-xl font-bold text-muted-foreground">min</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Commandée {formatRelativeTime(order.created_at)}
            </p>
          </div>
        )}

        {isDelivered && (
          <>
            <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center shadow-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-background">
                <PackageCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 font-display text-xl font-extrabold">Bon appétit !</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Votre commande a été livrée. Merci d&apos;avoir choisi {order.restaurant_name}.
              </p>
            </div>
            <ReviewForm orderId={order.id} />
          </>
        )}

        {isCancelled && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <XCircle className="h-6 w-6" />
            </div>
            <p className="mt-3 font-display text-xl font-extrabold">Commande annulée</p>
            {order.cancellation_reason ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Raison : <span className="font-medium">{order.cancellation_reason}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Contactez {order.restaurant_name} pour plus d&apos;informations.
              </p>
            )}
          </div>
        )}

        {/* Progress timeline */}
        {!isCancelled && (
          <div className="rounded-2xl border border-border bg-background p-6 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Progression
            </p>
            <ol className="mt-4 space-y-4">
              {STEPS.map((s, i) => {
                const done = stepIndex > i;
                const current = stepIndex === i;
                const upcoming = stepIndex < i;
                const Icon = s.icon;
                return (
                  <li key={s.key} className="relative flex items-start gap-3">
                    {i < STEPS.length - 1 && (
                      <span
                        className={
                          'absolute left-[15px] top-8 h-full w-0.5 -translate-x-1/2 ' +
                          (done ? 'bg-success' : 'bg-border')
                        }
                      />
                    )}
                    <span
                      className={
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ' +
                        (done
                          ? 'bg-success text-background'
                          : current
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'border border-border bg-background text-muted-foreground')
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 pt-1">
                      <p
                        className={
                          'font-semibold ' +
                          (upcoming ? 'text-muted-foreground' : 'text-foreground')
                        }
                      >
                        {s.label}
                      </p>
                      {current && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          En cours
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Détails */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Détails
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Adresse</span>
              <span className="text-right font-medium">{order.customer_address}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Total à payer</span>
              <span className="font-display text-base font-bold tabular-nums">
                {formatPrice(order.total)}
              </span>
            </p>
            {!isDelivered && !isCancelled && (
              <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Cette page se met à jour automatiquement
              </p>
            )}
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/r/${slug}/menu`}>Commander à nouveau</Link>
        </Button>
      </section>
    </main>
  );
}
