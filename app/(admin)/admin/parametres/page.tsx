import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { AdminSettingsForms } from './settings-form';
import { SubscriptionSettingsForms } from './subscription-settings-form';
import { fetchPlatformSettings, fetchSubscriptionPlans } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export default async function AdminParametresPage() {
  const { profile } = await requireRole('admin');
  const supabase = await createClient();
  const [{ data }, settings, plans] = await Promise.all([
    supabase
      .from('profiles')
      .select('username')
      .eq('id', profile.id)
      .maybeSingle<{ username: string | null }>(),
    fetchPlatformSettings(supabase),
    fetchSubscriptionPlans(supabase, true),
  ]);

  const currentUsername = data?.username ?? 'admin';

  return (
    <div className="container max-w-3xl space-y-8 py-6 md:py-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Compte"
          title="Paramètres admin"
          description="Modifiez votre identifiant et votre mot de passe de connexion."
        />
        <AdminSettingsForms currentUsername={currentUsername} />
      </div>

      <div className="space-y-6">
        <PageHeader
          eyebrow="Abonnements"
          title="Offres, essai & paiement"
          description="Configurez les prix des offres, la durée de l’essai, les remises et vos coordonnées de paiement (WhatsApp + CCP)."
        />
        <SubscriptionSettingsForms settings={settings} plans={plans} />
      </div>
    </div>
  );
}
