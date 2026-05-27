import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LivreurToggle } from './livreur-toggle';
import { Plus } from 'lucide-react';
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

  return (
    <div className="container space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Livreurs</h1>
          <p className="text-sm text-muted-foreground">Vos livreurs peuvent se connecter sur /livreur/login.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/livreurs/nouveau">
            <Plus className="h-4 w-4" /> Ajouter un livreur
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste ({livreurs?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!livreurs || livreurs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun livreur. Ajoutez-en pour pouvoir assigner les commandes.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {livreurs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{l.username} {l.phone && `· ${l.phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={l.is_active ? 'success' : 'secondary'}>
                      {l.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                    <LivreurToggle id={l.id} isActive={l.is_active} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
