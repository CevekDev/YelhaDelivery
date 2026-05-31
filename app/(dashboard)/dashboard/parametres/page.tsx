import Link from 'next/link';
import { getRestaurateurContext } from '@/lib/auth';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { SettingsForm } from './settings-form';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { restaurant } = await getRestaurateurContext();
  const params = await searchParams;
  const isSetup = !restaurant || params.setup === '1';

  return (
    <div className="container max-w-2xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow={isSetup ? 'Première configuration' : 'Paramètres'}
        title={isSetup ? 'Configurez votre restaurant' : 'Paramètres du restaurant'}
        description={
          isSetup
            ? 'Bienvenue ! Remplissez ces informations pour activer votre page publique.'
            : restaurant && (
                <>
                  Page publique :{' '}
                  <Link
                    href={`/r/${restaurant.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    /r/{restaurant.slug}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </>
              )
        }
      />

      <PanelCard padded={false}>
        <PanelHeader
          title="Informations du restaurant"
          description="Ces données apparaissent sur votre page publique."
        />
        <div className="p-5 md:p-6">
          <SettingsForm restaurant={restaurant} />
        </div>
      </PanelCard>
    </div>
  );
}
