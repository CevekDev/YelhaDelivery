import Link from 'next/link';
import { getRestaurateurContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { stopManagingRestaurantAction } from '@/app/(admin)/admin/restaurants/manage-actions';
import { BottomNav, Sidebar } from '@/components/dashboard/sidebar';
import { OpenToggle } from '@/components/dashboard/open-toggle';
import { DeliveryToggle } from '@/components/dashboard/delivery-toggle';
import { SubscriptionCenter } from '@/components/dashboard/subscription-center';
import {
  computeSubscriptionState,
  fetchPlatformSettings,
  fetchSubscriptionPlans,
} from '@/lib/subscription';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import type { SubscriptionRequest } from '@/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { restaurant, managingAsAdmin } = await getRestaurateurContext();
  const supabase = await createClient();
  const settings = await fetchPlatformSettings(supabase);

  const restaurantName = restaurant?.name ?? 'Configuration initiale';
  const state = restaurant ? computeSubscriptionState(restaurant, settings) : null;

  // Bandeau « gestion admin » : rappelle que l'admin édite le site d'un tiers,
  // avec un bouton pour quitter le contexte de gestion.
  const adminBanner = managingAsAdmin ? (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary md:px-6">
      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Vous gérez <strong>{restaurantName}</strong> en tant qu’administrateur.
      </span>
      <form action={stopManagingRestaurantAction}>
        <button
          type="submit"
          className="rounded-lg border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Quitter la gestion
        </button>
      </form>
    </div>
  ) : null;

  // Essai expiré sans abonnement → espace de gestion verrouillé.
  // Un admin en gestion n'est jamais bloqué (il intervient justement pour gérer).
  // Seuls les restos ACTIFS sont concernés : un resto « pending » attend encore
  // l'activation admin (son essai ne démarre vraiment qu'à l'activation).
  if (!managingAsAdmin && restaurant && restaurant.status === 'active' && state?.locked) {
    const [plans, { data: requests }] = await Promise.all([
      fetchSubscriptionPlans(supabase),
      supabase
        .from('subscription_requests')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(5)
        .returns<SubscriptionRequest[]>(),
    ]);
    const list = requests ?? [];
    const pendingRequest = list.find((r) => r.status === 'pending') ?? null;
    const lastRejected = !pendingRequest && list[0]?.status === 'rejected' ? list[0] : null;

    return (
      <div className="min-h-screen bg-muted/30">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <Link href="/dashboard/abonnement" className="font-display text-lg font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </form>
        </header>
        <main className="container max-w-4xl space-y-6 py-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {restaurantName}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              Réactivez votre espace
            </h1>
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              Votre essai gratuit est terminé. Choisissez une offre pour retrouver l’accès à la
              gestion de votre restaurant. Votre page publique reste en ligne pendant ce temps.
            </p>
          </div>
          <SubscriptionCenter
            plans={plans}
            settings={settings}
            state={state}
            restaurantName={restaurant.name}
            pendingRequest={pendingRequest}
            lastRejected={lastRejected}
            locked
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar restaurantName={restaurantName} />
      <div className="flex flex-1 flex-col">
        {adminBanner}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">
                {restaurantName}
              </p>
              {restaurant && (
                <p className="text-xs text-muted-foreground">
                  {restaurant.is_open ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Vous recevez des commandes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Fermé — pas de commandes acceptées
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          {restaurant && (
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              >
                Voir ma page
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {restaurant.is_open ? 'Ouvert' : 'Fermé'}
                </span>
                <OpenToggle isOpen={restaurant.is_open} />
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-medium sm:inline">Livraison</span>
                <DeliveryToggle accept={restaurant.accept_orders} />
              </div>
            </div>
          )}
        </header>

        {restaurant?.status === 'pending' && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning md:px-6">
            <strong>⏳ Compte en attente de validation.</strong> Vous pouvez préparer votre menu et
            votre page dès maintenant. Votre site sera mis en ligne dès qu’un administrateur
            YelhaDelivery aura activé votre compte.
          </div>
        )}
        {restaurant?.status === 'suspended' && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-6">
            <strong>⛔ Compte suspendu.</strong> Contactez le support pour réactiver votre restaurant.
          </div>
        )}
        {restaurant?.status === 'active' && state?.phase === 'trialing' && (
          <Link
            href="/dashboard/abonnement"
            className="block border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning hover:bg-warning/15 md:px-6"
          >
            <strong>
              ⏳ Essai gratuit — {state.daysLeft} jour{state.daysLeft > 1 ? 's' : ''} restant
              {state.daysLeft > 1 ? 's' : ''}.
            </strong>{' '}
            Choisissez une offre pour continuer après l’essai →
          </Link>
        )}
        {restaurant?.status === 'active' && state?.phase === 'active' && !state.isLifetime && state.daysLeft <= 5 && (
          <Link
            href="/dashboard/abonnement"
            className="block border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning hover:bg-warning/15 md:px-6"
          >
            <strong>
              Votre abonnement expire dans {state.daysLeft} jour{state.daysLeft > 1 ? 's' : ''}.
            </strong>{' '}
            Renouvelez pour éviter toute coupure →
          </Link>
        )}
        {restaurant && !restaurant.accept_orders && restaurant.is_open && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning md:px-6">
            ⚠ Livraison en pause — votre menu reste visible mais les clients ne peuvent pas
            commander. Réactivez-la avec l’interrupteur « Livraison » en haut à droite.
          </div>
        )}

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
