'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Bike,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Infinity as InfinityIcon,
  Lock,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';
import { buildWhatsAppLink, computePlanPrice, SUBSCRIPTION_PERIODS } from '@/lib/subscription';
import type {
  PlatformSettings,
  SubscriptionPlan,
  SubscriptionRequest,
} from '@/types/database';
import type { SubscriptionState } from '@/lib/subscription';
import {
  requestSubscriptionAction,
  cancelSubscriptionRequestAction,
} from '@/app/(dashboard)/dashboard/abonnement/actions';

const PLAN_ICON: Record<string, typeof Bike> = {
  starter: Bike,
  pro: BadgeCheck,
  golden: Crown,
};

function driverLabel(limit: number | null): string {
  if (limit === null) return 'Livreurs illimités';
  return `${limit} livreur${limit > 1 ? 's' : ''}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface Props {
  plans: SubscriptionPlan[];
  settings: PlatformSettings;
  state: SubscriptionState;
  restaurantName: string;
  pendingRequest: SubscriptionRequest | null;
  lastRejected: SubscriptionRequest | null;
  /** Rendu dans l'écran verrouillé (essai expiré). */
  locked?: boolean;
}

export function SubscriptionCenter({
  plans,
  settings,
  state,
  restaurantName,
  pendingRequest,
  lastRejected,
  locked = false,
}: Props) {
  const router = useRouter();
  const [months, setMonths] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const quote = useMemo(
    () => (selectedPlan ? computePlanPrice(selectedPlan.monthly_price, months, settings) : null),
    [selectedPlan, months, settings],
  );

  const paymentConfigured = Boolean(settings.ccp_number || settings.whatsapp_number);

  function onSubmit(fd: FormData) {
    startTransition(async () => {
      setError(null);
      const res = await requestSubscriptionAction(fd);
      if (!res.ok) {
        setError(res.error ?? 'Une erreur est survenue.');
      } else {
        setSelectedPlanId(null);
        router.refresh();
      }
    });
  }

  function onCancel(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await cancelSubscriptionRequestAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <StatusCard state={state} locked={locked} />

      {pendingRequest ? (
        <PendingCard
          request={pendingRequest}
          onCancel={() => onCancel(pendingRequest.id)}
          busy={isPending}
        />
      ) : (
        <>
          {lastRejected?.admin_note && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Demande refusée.</strong> {lastRejected.admin_note}
              </span>
            </div>
          )}

          {state.isLifetime ? (
            <div className="rounded-2xl border border-success/30 bg-success/5 p-5 text-sm md:p-6">
              <p className="flex items-center gap-2 font-display text-base font-bold text-success">
                <InfinityIcon className="h-5 w-5" /> Accès complet à vie
              </p>
              <p className="mt-1 text-muted-foreground">
                Vous bénéficiez d’un accès illimité et sans abonnement. Merci de votre confiance&nbsp;!
              </p>
            </div>
          ) : (
            <>
              <PeriodToggle months={months} onChange={setMonths} settings={settings} />

              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    months={months}
                    settings={settings}
                    selected={selectedPlanId === plan.id}
                    isCurrent={state.planId === plan.id && state.phase === 'active'}
                    onSelect={() => {
                      setError(null);
                      setSelectedPlanId((cur) => (cur === plan.id ? null : plan.id));
                    }}
                  />
                ))}
              </div>

              {selectedPlan && quote && (
                <PurchasePanel
                  plan={selectedPlan}
                  quote={quote}
                  months={months}
                  settings={settings}
                  restaurantName={restaurantName}
                  paymentConfigured={paymentConfigured}
                  onSubmit={onSubmit}
                  busy={isPending}
                  error={error}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatusCard({ state, locked }: { state: SubscriptionState; locked: boolean }) {
  if (locked || state.phase === 'expired') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 md:p-6">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-display text-base font-bold text-destructive">Votre essai gratuit est terminé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez une offre ci-dessous pour réactiver votre espace de gestion. Votre page publique
            reste en ligne. L’accès est rétabli dès validation de votre paiement.
          </p>
        </div>
      </div>
    );
  }
  if (state.phase === 'trialing') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-5 md:p-6">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="font-display text-base font-bold text-warning">
            Essai gratuit — {state.daysLeft} jour{state.daysLeft > 1 ? 's' : ''} restant
            {state.daysLeft > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Profitez de toutes les fonctionnalités gratuitement. Souscrivez une offre avant la fin de
            l’essai pour ne pas perdre l’accès à votre gestion.
          </p>
        </div>
      </div>
    );
  }
  // active payé
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-5 md:p-6">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div>
        <p className="font-display text-base font-bold text-success">Abonnement actif</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre accès est actif jusqu’au <strong>{formatDate(state.until)}</strong>
          {state.daysLeft <= 7 && ` (${state.daysLeft} jour${state.daysLeft > 1 ? 's' : ''} restant${state.daysLeft > 1 ? 's' : ''})`}
          . Vous pouvez renouveler ou changer d’offre à tout moment.
        </p>
      </div>
    </div>
  );
}

function PeriodToggle({
  months,
  onChange,
  settings,
}: {
  months: number;
  onChange: (m: number) => void;
  settings: PlatformSettings;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
      {SUBSCRIPTION_PERIODS.map((m) => {
        const discount = m >= 12 ? settings.discount_12m_percent : m >= 6 ? settings.discount_6m_percent : 0;
        const active = months === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={active}
          >
            {m} mois
            {discount > 0 && (
              <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                −{discount}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  months,
  settings,
  selected,
  isCurrent,
  onSelect,
}: {
  plan: SubscriptionPlan;
  months: number;
  settings: PlatformSettings;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const quote = computePlanPrice(plan.monthly_price, months, settings);
  const Icon = PLAN_ICON[plan.id] ?? CreditCard;
  const perMonth = months > 1 ? Math.round(quote.total / months) : plan.monthly_price;

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border bg-background p-5 shadow-card transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        plan.id === 'golden' && !selected && 'border-warning/40',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            plan.id === 'golden' ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {isCurrent && <Badge variant="success">Offre actuelle</Badge>}
      </div>

      <h3 className="mt-3 font-display text-lg font-extrabold">{plan.name}</h3>
      <p className="text-sm text-muted-foreground">{driverLabel(plan.driver_limit)}</p>

      <div className="mt-4">
        <p className="font-display text-2xl font-extrabold tabular-nums">{formatPrice(quote.total)}</p>
        <p className="text-xs text-muted-foreground">
          {months > 1 ? (
            <>
              pour {months} mois · soit {formatPrice(perMonth)}/mois
            </>
          ) : (
            'par mois'
          )}
        </p>
        {quote.discountPercent > 0 && (
          <p className="mt-1 text-xs font-semibold text-success">
            Vous économisez {formatPrice(quote.savings)} ({quote.discountPercent}%)
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={onSelect}
        variant={selected ? 'default' : 'outline'}
        className="mt-5 w-full"
      >
        {selected ? 'Sélectionné' : 'Acheter'}
      </Button>
    </div>
  );
}

function PurchasePanel({
  plan,
  quote,
  months,
  settings,
  restaurantName,
  paymentConfigured,
  onSubmit,
  busy,
  error,
}: {
  plan: SubscriptionPlan;
  quote: ReturnType<typeof computePlanPrice>;
  months: number;
  settings: PlatformSettings;
  restaurantName: string;
  paymentConfigured: boolean;
  onSubmit: (fd: FormData) => void;
  busy: boolean;
  error: string | null;
}) {
  const [hasProof, setHasProof] = useState(false);
  const waMessage = `Bonjour, je souhaite m'abonner à YelhaDelivery.
Restaurant : ${restaurantName}
Offre : ${plan.name} (${months} mois)
Montant : ${quote.total} DA
Je vous envoie ma preuve de paiement.`;
  const waLink = buildWhatsAppLink(settings.whatsapp_number, waMessage);

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/[0.03] p-5 md:p-6">
      <h3 className="font-display text-lg font-bold">
        Paiement — {plan.name} · {months} mois
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Effectuez le virement du montant ci-dessous vers notre compte CCP, puis joignez une capture
        de la preuve de paiement. Votre demande sera validée par notre équipe.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Montant à payer
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-primary tabular-nums">
            {formatPrice(quote.total)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coordonnées CCP
          </p>
          {settings.ccp_number ? (
            <dl className="mt-1.5 space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">N° CCP</dt>
                <dd className="font-mono font-semibold">{settings.ccp_number}</dd>
              </div>
              {settings.ccp_key && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Clé</dt>
                  <dd className="font-mono font-semibold">{settings.ccp_key}</dd>
                </div>
              )}
              {settings.ccp_name && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Titulaire</dt>
                  <dd className="font-semibold">{settings.ccp_name}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-1.5 text-muted-foreground">Coordonnées bientôt disponibles.</p>
          )}
        </div>
      </div>

      {settings.payment_note && (
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {settings.payment_note}
        </p>
      )}

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Envoyer ma preuve sur WhatsApp
        </a>
      )}

      <form action={onSubmit} className="mt-5 space-y-3 border-t border-border pt-4">
        <input type="hidden" name="plan_id" value={plan.id} />
        <input type="hidden" name="months" value={months} />
        <div className="space-y-1.5">
          <label htmlFor="proof" className="text-sm font-semibold">
            Preuve de paiement (capture / photo) *
          </label>
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            onChange={(e) => setHasProof(!!e.target.files?.length)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary-dark"
          />
          <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · 5 Mo max.</p>
        </div>

        {!paymentConfigured && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Les coordonnées de paiement ne sont pas encore configurées. Contactez le support avant de
            payer.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || !hasProof} className="w-full sm:w-auto">
          <Upload className="h-4 w-4" />
          {busy ? 'Envoi…' : 'Envoyer ma demande d’abonnement'}
        </Button>
      </form>
    </div>
  );
}

function PendingCard({
  request,
  onCancel,
  busy,
}: {
  request: SubscriptionRequest;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-warning">
            Demande en attente de validation
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre demande pour l’offre <strong>{request.plan_name}</strong> ({request.months} mois ·{' '}
            {formatPrice(request.total_price)}) a bien été envoyée. Notre équipe la validera après
            vérification de votre paiement.
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
              Annuler la demande
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
