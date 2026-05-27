import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { StatusActions } from './status-actions';
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
    <div className="container max-w-3xl space-y-6 py-6">
      <div>
        <Link
          href="/admin/restaurants"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Restaurants
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{restaurant.name}</h1>
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
        </div>
        <p className="text-sm text-muted-foreground">
          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            /r/{restaurant.slug}
          </a>{' '}
          · créé {formatRelativeTime(restaurant.created_at)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Commandes (total)</p>
            <p className="font-display text-xl font-bold">{ordersCount ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Livreurs</p>
            <p className="font-display text-xl font-bold">{livreursCount ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Frais livraison</p>
            <p className="font-display text-xl font-bold">{formatPrice(restaurant.delivery_fee)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Propriétaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {owner ? (
            <>
              <p>{owner.full_name}</p>
              <p className="text-muted-foreground">{owner.phone}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Aucun propriétaire associé.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modération</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusActions id={restaurant.id} current={restaurant.status} />
        </CardContent>
      </Card>
    </div>
  );
}
