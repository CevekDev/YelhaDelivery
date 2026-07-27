import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { SubscriptionCenter } from '@/components/dashboard/subscription-center';
import {
  computeSubscriptionState,
  fetchPlatformSettings,
  fetchSubscriptionPlans,
} from '@/lib/subscription';
import type { SubscriptionRequest } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AbonnementPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [settings, plans, { data: requests }] = await Promise.all([
    fetchPlatformSettings(supabase),
    fetchSubscriptionPlans(supabase),
    supabase
      .from('subscription_requests')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<SubscriptionRequest[]>(),
  ]);

  const state = computeSubscriptionState(restaurant, settings);
  const list = requests ?? [];
  const pendingRequest = list.find((r) => r.status === 'pending') ?? null;
  const lastRejected =
    !pendingRequest && list[0]?.status === 'rejected' ? list[0] : null;

  return (
    <div className="container max-w-4xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Abonnement"
        title="Mon abonnement"
        description="Gérez votre offre YelhaDelivery. Un mois, ou engagez-vous sur 6 ou 12 mois pour profiter d’une remise."
      />
      <SubscriptionCenter
        plans={plans}
        settings={settings}
        state={state}
        restaurantName={restaurant.name}
        pendingRequest={pendingRequest}
        lastRejected={lastRejected}
      />
    </div>
  );
}
