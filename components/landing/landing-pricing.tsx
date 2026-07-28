import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { LandingPlan, LandingPricing } from '@/lib/public-data';

// Repli si la table n'est pas encore renseignée (avant migration) : mêmes
// valeurs que les seeds pour ne jamais afficher une grille vide.
const FALLBACK_PLANS: LandingPlan[] = [
  { id: 'starter', name: 'Starter', monthly_price: 2500, driver_limit: 1, description: '1 seul livreur' },
  { id: 'pro', name: 'Pro', monthly_price: 4500, driver_limit: 3, description: 'Jusqu’à 3 livreurs' },
  { id: 'golden', name: 'Golden', monthly_price: 7500, driver_limit: null, description: 'Livreurs illimités' },
];

const INCLUDED = [
  'Menu illimité (plats, photos, catégories)',
  'Sauces, suppléments, offres du moment',
  'Variantes (tailles) par plat',
  'Commandes en temps réel',
  'Codes promo personnalisés',
  'Suivi commande client',
  'Statistiques & chiffre d’affaires',
  'Avis clients & horaires d’ouverture',
  'Site web personnalisé + blog',
  'Données hébergées en Europe',
];

function driverText(plan: LandingPlan): string {
  if (plan.description) return plan.description;
  if (plan.driver_limit === null) return 'Livreurs illimités';
  return `${plan.driver_limit} livreur${plan.driver_limit > 1 ? 's' : ''}`;
}

export function PricingSection({ pricing }: { pricing: LandingPricing }) {
  const plans = pricing.plans.length > 0 ? pricing.plans : FALLBACK_PLANS;

  return (
    <section id="tarifs" className="scroll-mt-16 bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {pricing.trialDays} jours gratuits
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Essayez gratuitement. <span className="text-primary">Puis choisissez votre offre.</span>
          </h2>
          <p className="mt-3 text-base text-gray-500">
            {pricing.trialDays} jours d’essai gratuit, sans carte bancaire. Ensuite un abonnement
            mensuel simple — <strong>zéro commission</strong> sur vos ventes.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const highlighted = i === 1; // l'offre du milieu
            return (
              <div
                key={plan.id}
                className={
                  'relative flex flex-col rounded-3xl border-2 bg-white p-8 shadow-sm ' +
                  (highlighted ? 'border-primary shadow-xl md:-translate-y-2' : 'border-gray-100')
                }
              >
                {highlighted && (
                  <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-lg">
                    Le plus choisi
                  </div>
                )}
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  {plan.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-[#1A1A1A]">
                    {formatPrice(Number(plan.monthly_price))}
                  </span>
                  <span className="text-sm font-medium text-gray-500">/ mois</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-primary">{driverText(plan)}</p>

                <Link
                  href="/register"
                  className={
                    'mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all ' +
                    (highlighted
                      ? 'bg-primary text-white shadow-[0_4px_20px_rgb(255,92,26,0.30)] hover:bg-primary-dark'
                      : 'border-2 border-primary/30 text-primary hover:bg-primary/5')
                  }
                >
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-2 text-center text-xs text-gray-400">
                  Gratuit {pricing.trialDays} jours, puis {formatPrice(Number(plan.monthly_price))}/mois
                </p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-gray-500">
          💡 Payez à l’avance et économisez : <strong>−{pricing.discount6}%</strong> sur 6 mois,{' '}
          <strong>−{pricing.discount12}%</strong> sur 12 mois.
        </p>

        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-500">
            Toutes les offres incluent
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function FaqSection({
  trialDays,
  startingPrice,
}: {
  trialDays: number;
  startingPrice: number | null;
}) {
  const priceText = startingPrice != null ? formatPrice(Number(startingPrice)) : '2 500 DA';
  const faq: { q: string; a: string }[] = [
    {
      q: 'Combien ça coûte ?',
      a: `${trialDays} jours d’essai gratuit pour tout tester, sans carte bancaire. Ensuite, un abonnement mensuel à partir de ${priceText}/mois selon le nombre de livreurs — et jamais aucune commission sur vos ventes. Vous gardez 100 % de ce que paient vos clients.`,
    },
    {
      q: 'Quelle est la différence entre les offres ?',
      a: 'Toutes les offres incluent exactement les mêmes fonctionnalités. Elles se distinguent uniquement par le nombre de livreurs : Starter (1 livreur), Pro (jusqu’à 3), Golden (livreurs illimités). Payez 6 ou 12 mois d’avance pour bénéficier d’une remise.',
    },
    {
      q: 'Et si je n’ai pas de livreurs ?',
      a: 'Vous pouvez démarrer avec l’offre Starter (un seul livreur), les vôtres, ou livrer vous-même. Vous créez leurs comptes en quelques secondes et ils reçoivent les commandes sur leur téléphone.',
    },
    {
      q: 'Comment mes clients paient-ils ?',
      a: 'En espèces, à la livraison — le mode le plus courant en Algérie. Aucune carte ni intégration bancaire nécessaire.',
    },
    {
      q: 'À qui appartiennent mes clients et mes données ?',
      a: 'À vous, à 100 %. Contrairement aux grandes plateformes, vos clients restent les vôtres. Vos données sont hébergées en Europe.',
    },
    {
      q: 'Combien de temps pour être en ligne ?',
      a: 'Environ 5 minutes : créez votre compte, ajoutez quelques plats, et votre lien de commande est prêt à partager sur Instagram ou WhatsApp.',
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <MessageSquare className="h-3.5 w-3.5" /> Questions fréquentes
        </span>
        <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          Tout ce que vous vous demandez
        </h2>
      </div>
      <div className="mt-10 space-y-3">
        {faq.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {f.q}
              <span className="shrink-0 text-xl leading-none text-primary transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
