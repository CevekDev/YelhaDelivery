import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { HoursEditor } from './editor';
import type { OpeningHour } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HorairesPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();
  const { data: hours } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('day_of_week')
    .returns<OpeningHour[]>();

  return (
    <div className="container max-w-2xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Configuration"
        title="Horaires d'ouverture"
        description="Définissez vos heures jour par jour. Les clients ne pourront pas commander en dehors de ces plages."
      />

      <PanelCard padded={false}>
        <PanelHeader
          title="Semaine"
          description="Si aucun horaire n'est défini, votre restaurant est considéré ouvert tant que vous activez le toggle « Ouvert » dans la barre du haut."
        />
        <div className="p-5 md:p-6">
          <HoursEditor initialHours={hours ?? []} />
        </div>
      </PanelCard>
    </div>
  );
}
