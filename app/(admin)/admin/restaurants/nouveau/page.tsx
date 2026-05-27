import { requireRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateRestaurateurForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NouveauRestaurantPage() {
  await requireRole('admin');
  return (
    <div className="container max-w-xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte restaurateur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Un email de bienvenue sera envoyé au restaurateur avec le lien de connexion.
          </p>
          <CreateRestaurateurForm />
        </CardContent>
      </Card>
    </div>
  );
}
