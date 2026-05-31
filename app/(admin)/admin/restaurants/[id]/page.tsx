import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { StatusActions } from './status-actions';
import { ArrowLeft, ExternalLink, ShoppingBag, Bike, Truck } from 'lucide-react';
import type { Profile, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const admin = await createAdminClient();

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle<Restaurant>();
  if (!restaurant) notFound();

  const [{ data: owner }, { count: ordersCount }, { count: livreursCount }] = await Promise.all([
    restaurant.owner_id
      ? admin.from('profiles').select('*').eq('id', restaurant.owner_id).maybeSingle<Profile>()
      : { data: null as Profile | null },
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', id),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', id)
      .eq('role', 'livreur'),
  ]);

  return (
    <div className="container max-w-4xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Restaurant"
        title={restaurant.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                restaurant.status === 'active'
                  ? 'success'
                  : restaurant.status === 'suspended'
                    ? 'destructive'
                    : 'warning'
              }
            >
              {restaurant.status}
            </Badge>
            {restaurant.is_open && <Badge variant="info">ouvert</Badge>}
            <span className="text-xs">· créé {formatRelativeTime(restaurant.created_at)}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/restaurants">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/r/${restaurant.slug}`} target="_blank" rel="noreferrer">
                Voir la page
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Stat icon={ShoppingBag} label="Commandes (total)" value={(ordersCount ?? 0).toString()} />
        <Stat icon={Bike} label="Livreurs" value={(livreursCount ?? 0).toString()} />
        <Stat icon={Truck} label="Frais livraison" value={formatPrice(restaurant.delivery_fee)} />
      </div>

      <PanelCard padded={false}>
        <PanelHeader title="Propriétaire" />
        <div className="px-5 py-4 md:px-6">
          {owner ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {owner.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-semibold">{owner.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {owner.phone || 'Aucun téléphone'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun propriétaire associé.</p>
          )}
        </div>
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader
          title="Modération"
          description="Modifier le statut du restaurant. Un statut suspendu masque le restaurant publiquement."
        />
        <div className="px-5 py-5 md:px-6">
          <StatusActions id={restaurant.id} current={restaurant.status} />
        </div>
      </PanelCard>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 truncate font-display text-xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
