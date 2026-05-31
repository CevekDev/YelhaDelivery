import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { LivreurForm } from './livreur-form';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NouveauLivreurPage() {
  await requireRestaurateur();
  return (
    <div className="container max-w-xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Équipe"
        title="Nouveau livreur"
        description={
          <>
            Le livreur se connectera sur{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/livreur/login</code> avec
            son identifiant et son mot de passe.
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/livreurs">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />
      <PanelCard>
        <LivreurForm />
      </PanelCard>
    </div>
  );
}
