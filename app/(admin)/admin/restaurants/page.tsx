import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { computeSubscriptionState, fetchPlatformSettings } from '@/lib/subscription';
import type { SubscriptionState } from '@/lib/subscription';
import { Plus, Search, Store } from 'lucide-react';
import type { Restaurant, RestaurantStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<RestaurantStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  pending: 'En attente',
};

const STATUS_FILTERS = ['all', 'active', 'pending', 'suspended'] as const;

function subBadge(state: SubscriptionState) {
  if (state.isLifetime) return { label: 'À vie', variant: 'secondary' as const };
  if (state.phase === 'trialing')
    return { label: `Essai ${state.daysLeft}j`, variant: 'warning' as const };
  if (state.phase === 'active')
    return { label: `Abonné${state.daysLeft <= 7 ? ` ${state.daysLeft}j` : ''}`, variant: 'success' as const };
  return { label: 'Expiré', variant: 'destructive' as const };
}

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole('admin');
  const admin = await createClient();
  const params = await searchParams;
  const q = (params.q ?? '').trim().toLowerCase();
  const statusFilter = STATUS_FILTERS.includes((params.status ?? 'all') as (typeof STATUS_FILTERS)[number])
    ? ((params.status ?? 'all') as (typeof STATUS_FILTERS)[number])
    : 'all';

  const [{ data: restaurantsRaw }, settings] = await Promise.all([
    admin.from('restaurants').select('*').order('created_at', { ascending: false }).returns<Restaurant[]>(),
    fetchPlatformSettings(admin),
  ]);

  const all = restaurantsRaw ?? [];
  const restaurants = all.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
    return true;
  });

  const total = all.length;
  const activeCount = all.filter((r) => r.status === 'active').length;
  const suspendedCount = all.filter((r) => r.status === 'suspended').length;

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

      {/* Recherche + filtres (formulaire GET, sans JS) */}
      <div className="space-y-3">
        <form action="/admin/restaurants" method="get" className="flex gap-2">
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Rechercher par nom ou lien…"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => {
            const active = s === statusFilter;
            const qs = new URLSearchParams();
            if (params.q) qs.set('q', params.q);
            if (s !== 'all') qs.set('status', s);
            const href = `/admin/restaurants${qs.toString() ? `?${qs.toString()}` : ''}`;
            return (
              <Link
                key={s}
                href={href}
                className={
                  'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
                  (active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground')
                }
              >
                {s === 'all' ? 'Tous' : STATUS_LABELS[s as RestaurantStatus]}
              </Link>
            );
          })}
        </div>
      </div>

      <PanelCard padded={false}>
        <PanelHeader title={`Liste (${restaurants.length})`} />
        {restaurants.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">
              {total === 0 ? 'Aucun restaurant pour le moment' : 'Aucun résultat'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {total === 0
                ? 'Créez le premier ou attendez les inscriptions publiques.'
                : 'Modifiez votre recherche ou le filtre de statut.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {restaurants.map((r) => {
              const sub = subBadge(computeSubscriptionState(r, settings));
              return (
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
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Badge variant={sub.variant}>{sub.label}</Badge>
                      <Badge
                        variant={
                          r.status === 'active'
                            ? 'success'
                            : r.status === 'suspended'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {STATUS_LABELS[r.status]}
                      </Badge>
                      {r.is_open && <Badge variant="info">ouvert</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
