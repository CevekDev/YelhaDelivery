'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
import { cancelPublicOrderAction, submitReviewAction } from './actions';
import { OrderPushSubscribe } from '@/components/order-push-subscribe';
import type { OrderStatus } from '@/types/database';

interface PublicOrder {
  id: string;
  order_number: string;
  restaurant_slug: string;
  restaurant_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_address: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  created_at: string;
  estimated_delivery_time: number;
  cancellation_reason: string | null;
  delivery_fee_set_at: string | null;
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
      <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-center ">
        <p className="font-[family-name:var(--font-site-heading)] text-lg font-bold text-success">Merci pour votre avis !</p>
        <p className="mt-1 text-sm text-[color:var(--site-muted)]">Votre retour aide le restaurant à s&apos;améliorer.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5 ">
      <p className="font-[family-name:var(--font-site-heading)] text-base font-bold">Donnez votre avis</p>
      <p className="mt-0.5 text-xs text-[color:var(--site-muted)]">Partagez votre expérience en quelques secondes.</p>

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
                  : 'fill-muted text-[color:var(--site-muted)]/30'
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
        className="mt-4 w-full resize-none rounded-lg border border-[var(--site-border)] bg-[var(--site-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <button
        type="button"
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
        className="mt-3 flex h-11 w-full items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-accent)] px-4 text-sm font-bold text-[color:var(--site-accent-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Envoi…' : 'Envoyer l\'avis'}
      </button>
    </div>
  );
}

/* ─── Tracking principal ─── */
export function TrackingClient({ slug, initial }: { slug: string; initial: PublicOrder }) {
  const [order, setOrder] = useState<PublicOrder>(initial);
  const [now, setNow] = useState(Date.now());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, startCancel] = useTransition();

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

  // Le client peut annuler tant que la commande n'est pas en préparation.
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const feeSet = order.delivery_fee_set_at != null;

  const handleCancel = () => {
    startCancel(async () => {
      setCancelError(null);
      const res = await cancelPublicOrderAction(order.id);
      if (res.ok) {
        setOrder((o) => ({ ...o, status: 'cancelled', cancellation_reason: 'Annulée par le client' }));
        setCancelOpen(false);
      } else {
        setCancelError(res.reason ?? "Impossible d'annuler la commande.");
      }
    });
  };

  const createdMs = new Date(order.created_at).getTime();
  const etaMs = createdMs + order.estimated_delivery_time * 60_000;
  const remainingMin = Math.max(0, Math.round((etaMs - now) / 60_000));

  return (
    <main>
      <header className="border-b border-[var(--site-border)]">
        <div className="mx-auto max-w-xl px-4 py-5 md:px-6">
          <Link href={`/r/${slug}/menu`} className="text-xs text-[color:var(--site-muted)] hover:text-[color:var(--site-text)]">
            ← Retour au menu
          </Link>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
                Suivi en direct
              </p>
              <h1 className="font-[family-name:var(--font-site-heading)] text-2xl font-extrabold tracking-tight text-[color:var(--site-text)]">
                {order.restaurant_name}
              </h1>
              <p className="mt-1 font-mono text-xs text-[color:var(--site-accent)]">{order.order_number}</p>
            </div>
            <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-xl space-y-4 px-4 py-6 md:px-6">
        {/* Big ETA card */}
        {!isCancelled && !isDelivered && (
          <div className="overflow-hidden rounded-2xl border border-[var(--site-border)] bg-gradient-to-br from-[var(--site-accent)]/10 via-[var(--site-surface)] to-[var(--site-surface)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-accent)]">
              Arrivée estimée
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="font-[family-name:var(--font-site-heading)] text-5xl font-extrabold tracking-tight tabular-nums">
                {remainingMin}
              </p>
              <p className="font-[family-name:var(--font-site-heading)] text-xl font-bold text-[color:var(--site-muted)]">min</p>
            </div>
            <p className="mt-2 text-sm text-[color:var(--site-muted)]">
              Commandée {formatRelativeTime(order.created_at)}
            </p>
          </div>
        )}

        {/* Opt-in notifications push (proposé, jamais imposé) */}
        {!isCancelled && !isDelivered && <OrderPushSubscribe orderId={order.id} />}

        {isDelivered && (
          <>
            <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center ">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
                <PackageCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 font-[family-name:var(--font-site-heading)] text-xl font-extrabold text-[color:var(--site-text)]">Bon appétit !</p>
              <p className="mt-1 text-sm text-[color:var(--site-muted)]">
                Votre commande a été livrée. Merci d&apos;avoir choisi {order.restaurant_name}.
              </p>
            </div>
            <ReviewForm orderId={order.id} />
          </>
        )}

        {isCancelled && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center ">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <XCircle className="h-6 w-6" />
            </div>
            <p className="mt-3 font-[family-name:var(--font-site-heading)] text-xl font-extrabold text-[color:var(--site-text)]">Commande annulée</p>
            {order.cancellation_reason ? (
              <p className="mt-1 text-sm text-[color:var(--site-muted)]">
                Raison : <span className="font-medium">{order.cancellation_reason}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-[color:var(--site-muted)]">
                Contactez {order.restaurant_name} pour plus d&apos;informations.
              </p>
            )}
          </div>
        )}

        {/* Progress timeline */}
        {!isCancelled && (
          <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6 ">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
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
                          (done ? 'bg-success' : 'bg-[var(--site-border)]')
                        }
                      />
                    )}
                    <span
                      className={
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ' +
                        (done
                          ? 'bg-success text-white'
                          : current
                            ? 'bg-[var(--site-accent)] text-[color:var(--site-accent-fg)] ring-4 ring-[var(--site-accent)]/20'
                            : 'border border-[var(--site-border)] bg-[var(--site-surface)] text-[color:var(--site-muted)]')
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 pt-1">
                      <p
                        className={
                          'font-semibold ' +
                          (upcoming ? 'text-[color:var(--site-muted)]' : 'text-[color:var(--site-text)]')
                        }
                      >
                        {s.label}
                      </p>
                      {current && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[color:var(--site-accent)]">
                          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--site-accent)]" />
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

        {/* Frais de livraison fixés → le client valide (en ne faisant rien) ou annule */}
        {canCancel && feeSet && (
          <div className="rounded-2xl border border-[var(--site-accent)]/40 bg-[var(--site-accent)]/10 p-5">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[color:var(--site-accent)]" />
              <p className="font-[family-name:var(--font-site-heading)] text-base font-bold text-[color:var(--site-text)]">
                Frais de livraison confirmés
              </p>
            </div>
            <p className="mt-2 text-sm text-[color:var(--site-muted)]">
              Le restaurant a fixé la livraison à{' '}
              <span className="font-semibold text-[color:var(--site-text)]">
                {formatPrice(order.delivery_fee)}
              </span>
              , soit un total de{' '}
              <span className="font-semibold text-[color:var(--site-text)]">
                {formatPrice(order.total)}
              </span>
              . Si cela vous convient, vous n&apos;avez rien à faire — votre commande suit son cours.
            </p>
          </div>
        )}

        {/* En attente du prix de livraison */}
        {canCancel && !feeSet && (
          <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            <p className="flex items-center gap-1.5 text-sm text-[color:var(--site-muted)]">
              <Clock className="h-4 w-4" />
              Le restaurant va confirmer les frais de livraison. Le total final s&apos;affichera ici.
            </p>
          </div>
        )}

        {/* Détails */}
        <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5 ">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
            Détails
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-[color:var(--site-muted)]">Adresse</span>
              <span className="text-right font-medium">{order.customer_address}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-[color:var(--site-muted)]">Sous-total</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </p>
            {order.discount_amount > 0 && (
              <p className="flex items-center justify-between text-success">
                <span>Réduction</span>
                <span className="tabular-nums">−{formatPrice(order.discount_amount)}</span>
              </p>
            )}
            <p className="flex items-center justify-between">
              <span className="text-[color:var(--site-muted)]">Frais de livraison</span>
              {feeSet ? (
                <span className="tabular-nums">{formatPrice(order.delivery_fee)}</span>
              ) : (
                <span className="font-medium text-[color:var(--site-accent)]">À confirmer</span>
              )}
            </p>
            <p className="flex items-center justify-between border-t border-[var(--site-border)] pt-2">
              <span className="text-[color:var(--site-muted)]">Total à payer</span>
              <span className="font-[family-name:var(--font-site-heading)] text-base font-bold tabular-nums">
                {formatPrice(order.total)}
              </span>
            </p>
            {!isDelivered && !isCancelled && (
              <p className="flex items-center gap-1.5 pt-2 text-xs text-[color:var(--site-muted)]">
                <Clock className="h-3 w-3" />
                Cette page se met à jour automatiquement
              </p>
            )}
          </div>
        </div>

        {/* Annulation par le client */}
        {canCancel && (
          <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5">
            {cancelError && <p className="mb-3 text-xs text-destructive">{cancelError}</p>}
            {!cancelOpen ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--site-radius)] border border-destructive/40 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                Annuler ma commande
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[color:var(--site-text)]">
                  Êtes-vous sûr de vouloir annuler cette commande ?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleCancel}
                    className="flex h-11 flex-1 items-center justify-center rounded-[var(--site-radius)] bg-destructive px-4 text-sm font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCancelling ? 'Annulation…' : "Oui, annuler"}
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setCancelOpen(false)}
                    className="flex h-11 flex-1 items-center justify-center rounded-[var(--site-radius)] border border-[var(--site-border)] px-4 text-sm font-semibold text-[color:var(--site-text)] transition-opacity hover:opacity-80"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/r/${slug}/menu`}
          className="flex h-11 w-full items-center justify-center rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] px-4 text-sm font-semibold text-[color:var(--site-text)] transition-opacity hover:opacity-80"
        >
          Commander à nouveau
        </Link>
      </section>
    </main>
  );
}
