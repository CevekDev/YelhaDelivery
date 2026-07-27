import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformSettings,
  Restaurant,
  SubscriptionPhase,
  SubscriptionPlan,
} from '@/types/database';

// =====================================================================
// Logique d'abonnement — partagée entre dashboard resto et panel admin.
//
// Modèle : un resto démarre par un essai gratuit (trial_days). Ensuite il doit
// souscrire une offre (Starter / Pro / Golden). Les restos « à vie »
// (subscription_lifetime) ne sont jamais bloqués. L'état est TOUJOURS calculé à
// la volée (pas de cron) : payer = accès restauré immédiatement.
// =====================================================================

const DAY_MS = 86_400_000;

/** Périodes d'engagement proposées, en mois. */
export const SUBSCRIPTION_PERIODS = [1, 6, 12] as const;
export type SubscriptionPeriod = (typeof SUBSCRIPTION_PERIODS)[number];

/** Valeurs par défaut si la ligne platform_settings est absente. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 1,
  trial_days: 7,
  discount_6m_percent: 10,
  discount_12m_percent: 20,
  whatsapp_number: '',
  ccp_number: '',
  ccp_name: '',
  ccp_key: '',
  payment_note: '',
  updated_at: '',
};

/** Lit la configuration globale (fallback sur les valeurs par défaut). */
export async function fetchPlatformSettings(sb: SupabaseClient): Promise<PlatformSettings> {
  const { data } = await sb
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle<PlatformSettings>();
  return data ?? DEFAULT_PLATFORM_SETTINGS;
}

/** Lit les offres actives triées. */
export async function fetchSubscriptionPlans(
  sb: SupabaseClient,
  includeInactive = false,
): Promise<SubscriptionPlan[]> {
  let query = sb.from('subscription_plans').select('*').order('sort_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data } = await query.returns<SubscriptionPlan[]>();
  return data ?? [];
}

/** Remise (%) applicable pour un nombre de mois donné. */
export function discountForMonths(months: number, settings: PlatformSettings): number {
  if (months >= 12) return settings.discount_12m_percent;
  if (months >= 6) return settings.discount_6m_percent;
  return 0;
}

export interface PriceQuote {
  months: number;
  monthly: number;
  discountPercent: number;
  /** Total arrondi au dinar. */
  total: number;
  /** Économie par rapport au tarif mensuel sans remise. */
  savings: number;
}

/** Calcule le prix total d'un engagement (mensuel × mois − remise). */
export function computePlanPrice(
  monthly: number,
  months: number,
  settings: PlatformSettings,
): PriceQuote {
  const discountPercent = discountForMonths(months, settings);
  const gross = monthly * months;
  const total = Math.round(gross * (1 - discountPercent / 100));
  return { months, monthly, discountPercent, total, savings: Math.round(gross - total) };
}

export interface SubscriptionState {
  phase: SubscriptionPhase;
  isLifetime: boolean;
  planId: string | null;
  /** Limite de livreurs effective : null = illimité, 0 = bloqué (expiré). */
  driverLimit: number | null;
  /** Jours entiers restants (essai ou abonnement). Infinity si à vie. */
  daysLeft: number;
  /** Date de fin (ISO) de la phase courante, si applicable. */
  until: string | null;
  /** Date de fin d'essai (ISO). */
  trialEndsAt: string;
  /** true si le resto doit payer pour retrouver l'accès. */
  locked: boolean;
}

/** Calcule l'état d'abonnement d'un restaurant à l'instant présent. */
export function computeSubscriptionState(
  restaurant: Pick<
    Restaurant,
    | 'trial_started_at'
    | 'subscription_plan_id'
    | 'subscription_expires_at'
    | 'subscription_lifetime'
    | 'subscription_driver_limit'
  >,
  settings: PlatformSettings,
): SubscriptionState {
  const now = Date.now();
  const trialStart = restaurant.trial_started_at
    ? new Date(restaurant.trial_started_at).getTime()
    : now;
  const trialEnds = trialStart + settings.trial_days * DAY_MS;
  const expires = restaurant.subscription_expires_at
    ? new Date(restaurant.subscription_expires_at).getTime()
    : null;

  const base = {
    isLifetime: restaurant.subscription_lifetime,
    planId: restaurant.subscription_plan_id,
    trialEndsAt: new Date(trialEnds).toISOString(),
  };

  if (restaurant.subscription_lifetime) {
    return {
      ...base,
      phase: 'active',
      driverLimit: restaurant.subscription_driver_limit,
      daysLeft: Number.POSITIVE_INFINITY,
      until: null,
      locked: false,
    };
  }
  if (expires !== null && expires > now) {
    return {
      ...base,
      phase: 'active',
      driverLimit: restaurant.subscription_driver_limit,
      daysLeft: Math.ceil((expires - now) / DAY_MS),
      until: restaurant.subscription_expires_at,
      locked: false,
    };
  }
  if (now < trialEnds) {
    return {
      ...base,
      phase: 'trialing',
      driverLimit: null, // essai = tout débloqué
      daysLeft: Math.ceil((trialEnds - now) / DAY_MS),
      until: new Date(trialEnds).toISOString(),
      locked: false,
    };
  }
  return {
    ...base,
    phase: 'expired',
    driverLimit: 0,
    daysLeft: 0,
    until: null,
    locked: true,
  };
}

/**
 * Nombre de livreurs autorisé pour un état d'abonnement.
 * `null` = illimité. Utilisé pour l'affichage et l'enforcement.
 */
export function effectiveDriverLimit(state: SubscriptionState): number | null {
  return state.driverLimit;
}

/** Construit un lien wa.me à partir d'un numéro (formaté librement) + message. */
export function buildWhatsAppLink(rawNumber: string, message: string): string | null {
  const digits = (rawNumber || '').replace(/[^\d]/g, '');
  if (digits.length < 6) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
