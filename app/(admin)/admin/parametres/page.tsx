import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { AdminSettingsForms } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminParametresPage() {
  const { profile } = await requireRole('admin');
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', profile.id)
    .maybeSingle<{ username: string | null }>();

  const currentUsername = data?.username ?? 'admin';

  return (
    <div className="container max-w-3xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Compte"
        title="Paramètres admin"
        description="Modifiez votre identifiant et votre mot de passe de connexion."
      />
      <AdminSettingsForms currentUsername={currentUsername} />
    </div>
  );
}
