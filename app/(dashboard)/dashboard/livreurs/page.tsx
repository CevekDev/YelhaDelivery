import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LivreurToggle } from './livreur-toggle';
import { Bike, Plus } from 'lucide-react';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function LivreursPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();
  const { data: livreurs } = await supabase
    .from('profiles')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('role', 'livreur')
    .order('created_at', { ascending: false })
    .returns<Profile[]>();

  const activeCount = livreurs?.filter((l) => l.is_active).length ?? 0;
  const total = livreurs?.length ?? 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Équipe"
        title="Mes livreurs"
        description={
          total > 0
            ? `${activeCount} actif${activeCount > 1 ? 's' : ''} sur ${total}`
            : 'Créez les comptes de vos livreurs pour leur assigner les commandes.'
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/livreurs/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau livreur
            </Link>
          </Button>
        }
      />

      <PanelCard padded={false}>
        <PanelHeader title={`Liste (${total})`} description="Vos livreurs se connectent sur /livreur/login." />

        {total === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Bike className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">Aucun livreur pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez votre premier livreur pour pouvoir lui assigner des commandes.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/livreurs/nouveau">
                <Plus className="h-4 w-4" />
                Ajouter un livreur
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(livreurs ?? []).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40 md:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {l.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{l.username}
                      {l.phone && <span> · {l.phone}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={l.is_active ? 'success' : 'secondary'}>
                    {l.is_active ? 'Actif' : 'Désactivé'}
                  </Badge>
                  <LivreurToggle id={l.id} isActive={l.is_active} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
