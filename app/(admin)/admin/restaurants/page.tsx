import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, Store } from 'lucide-react';
import type { Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantsPage() {
  await requireRole('admin');
  const admin = await createAdminClient();
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Restaurant[]>();

  const total = restaurants?.length ?? 0;
  const activeCount = restaurants?.filter((r) => r.status === 'active').length ?? 0;
  const suspendedCount = restaurants?.filter((r) => r.status === 'suspended').length ?? 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Modération"
        title="Restaurants"
        description={`${total} au total · ${activeCount} actif${activeCount > 1 ? 's' : ''}${suspendedCount > 0 ? ` · ${suspendedCount} suspendu${suspendedCount > 1 ? 's' : ''}` : ''}`}
        actions={
          <Button asChild>
            <Link href="/admin/restaurants/nouveau">
              <Plus className="h-4 w-4" />
              Créer un restaurant
            </Link>
          </Button>
        }
      />

      <PanelCard padded={false}>
        <PanelHeader title={`Liste (${total})`} />
        {total === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">Aucun restaurant pour le moment</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez le premier ou attendez les inscriptions publiques.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(restaurants ?? []).map((r) => (
              <li key={r.id} className="hover:bg-muted/40">
                <Link
                  href={`/admin/restaurants/${r.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 md:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /r/{r.slug} · créé {formatRelativeTime(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        r.status === 'active'
                          ? 'success'
                          : r.status === 'suspended'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                    {r.is_open && <Badge variant="info">ouvert</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
