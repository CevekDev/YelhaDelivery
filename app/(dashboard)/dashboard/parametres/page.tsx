import { getRestaurateurContext } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from './settings-form';

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
    <div className="container max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {isSetup ? 'Configuration de votre restaurant' : 'Paramètres'}
        </h1>
        {isSetup && (
          <p className="mt-2 text-sm text-muted-foreground">
            Bienvenue ! Remplissez ces informations pour activer votre page publique.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du restaurant</CardTitle>
          {restaurant && (
            <CardDescription>
              Page publique :{' '}
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                /r/{restaurant.slug}
              </a>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <SettingsForm restaurant={restaurant} />
        </CardContent>
      </Card>
    </div>
  );
}
