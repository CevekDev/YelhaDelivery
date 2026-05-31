import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { CreateRestaurateurForm } from './form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NouveauRestaurantPage() {
  await requireRole('admin');
  return (
    <div className="container max-w-xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Modération"
        title="Créer un compte restaurateur"
        description="Un email de bienvenue sera envoyé au restaurateur avec son lien de connexion."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/restaurants">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />
      <PanelCard>
        <CreateRestaurateurForm />
      </PanelCard>
    </div>
  );
}
