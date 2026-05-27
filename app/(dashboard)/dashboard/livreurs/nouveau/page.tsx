import { requireRestaurateur } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LivreurForm } from './livreur-form';

export const dynamic = 'force-dynamic';

export default async function NouveauLivreurPage() {
  await requireRestaurateur();
  return (
    <div className="container max-w-xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau livreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Le livreur se connectera sur <code className="rounded bg-input px-1">/livreur/login</code>{' '}
            avec son identifiant et son mot de passe.
          </p>
          <LivreurForm />
        </CardContent>
      </Card>
    </div>
  );
}
