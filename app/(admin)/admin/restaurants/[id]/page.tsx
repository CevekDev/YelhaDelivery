import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { StatusActions } from './status-actions';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { computeSubscriptionState, fetchPlatformSettings } from '@/lib/subscription';
import {
  ArrowLeft,
  Bike,
  CreditCard,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Star,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import type { Order, OrderStatus, Profile, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface OrderLite {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name: string;
}

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
  order: { customer_name: string } | { customer_name: string }[] | null;
}

interface OrderItemAgg {
  item_name: string;
  quantity: number;
}

export default async function AdminRestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const admin = await createClient();

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle<Restaurant>();
  if (!restaurant) notFound();

  const settings = await fetchPlatformSettings(admin);
  const sub = computeSubscriptionState(restaurant, settings);
  const subUntil = sub.until
    ? new Date(sub.until).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    { data: owner },
    { count: ordersCount },
    { count: livreursCount },
    { count: menuItemsCount },
    { data: allOrders30d },
    { data: recentOrders },
    { data: ratingData },
    { data: recentReviews },
    { data: deliveredOrderIds },
  ] = await Promise.all([
    restaurant.owner_id
      ? admin.from('profiles').select('*').eq('id', restaurant.owner_id).maybeSingle<Profile>()
      : Promise.resolve({ data: null as Profile | null }),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', id),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', id)
      .eq('role', 'livreur'),
    admin
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', id),
    admin
      .from('orders')
      .select('status, total, created_at')
      .eq('restaurant_id', id)
      .gte('created_at', start30d.toISOString())
      .returns<Pick<Order, 'status' | 'total' | 'created_at'>[]>(),
    admin
      .from('orders')
      .select('id, order_number, status, total, created_at, customer_name')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })
      .limit(8)
      .returns<OrderLite[]>(),
    admin.rpc('get_restaurant_rating', { p_restaurant_id: id }),
    admin
      .from('order_reviews')
      .select('rating, comment, created_at, order:orders(customer_name)')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('orders')
      .select('id')
      .eq('restaurant_id', id)
      .eq('status', 'delivered')
      .gte('created_at', start30d.toISOString()),
  ]);

  const orders30d = allOrders30d ?? [];
  const revenue30d = orders30d
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total), 0);
  const deliveredCount = orders30d.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders30d.filter((o) => o.status === 'cancelled').length;
  const cancelRate =
    orders30d.length > 0 ? Math.round((cancelledCount / orders30d.length) * 100) : 0;
  const avgOrderValue = deliveredCount > 0 ? revenue30d / deliveredCount : 0;

  type RatingRow = { avg_rating: number | null; review_count: number };
  const rating = ((ratingData ?? []) as unknown as RatingRow[])[0];
  const avgRating = rating?.avg_rating != null ? Number(rating.avg_rating) : null;
  const reviewCount = rating?.review_count ?? 0;
  const reviews = (recentReviews ?? []) as Review[];

  // Top plats de ce resto (30j)
  let topItems: OrderItemAgg[] = [];
  const deliveredIds = (deliveredOrderIds as { id: string }[] | null)?.map((o) => o.id) ?? [];
  if (deliveredIds.length > 0) {
    const { data: items } = await admin
      .from('order_items')
      .select('item_name, quantity')
      .in('order_id', deliveredIds)
      .returns<OrderItemAgg[]>();
    const agg = new Map<string, number>();
    for (const it of items ?? []) {
      agg.set(it.item_name, (agg.get(it.item_name) ?? 0) + it.quantity);
    }
    topItems = [...agg.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item_name, quantity]) => ({ item_name, quantity }));
  }

  return (
    <div className="container max-w-5xl space-y-6 py-6 md:py-8">
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
            <span className="text-xs">/r/{restaurant.slug}</span>
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

      {/* KPIs 30 jours */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat
          icon={TrendingUp}
          label="CA (30j)"
          value={formatPrice(revenue30d)}
          hint={`${deliveredCount} livrée${deliveredCount > 1 ? 's' : ''}`}
        />
        <Stat
          icon={ShoppingBag}
          label="Commandes (total)"
          value={(ordersCount ?? 0).toString()}
          hint={`${orders30d.length} sur 30j`}
        />
        <Stat
          icon={Package}
          label="Panier moyen"
          value={formatPrice(avgOrderValue)}
          hint={`${cancelRate}% annulées`}
        />
        <Stat
          icon={Star}
          label="Note moyenne"
          value={avgRating != null ? avgRating.toFixed(1) : '—'}
          hint={`${reviewCount} avis`}
        />
      </div>

      {/* Infos + config */}
      <div className="grid gap-6 md:grid-cols-2">
        <PanelCard>
          <PanelHeader title="Coordonnées" />
          <dl className="mt-4 space-y-3 text-sm">
            {restaurant.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {restaurant.address}
                  {restaurant.city && <span className="text-muted-foreground">, {restaurant.city}</span>}
                </span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${restaurant.phone}`} className="hover:underline">
                  {restaurant.phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{menuItemsCount ?? 0} articles au menu</span>
            </div>
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{livreursCount ?? 0} livreurs actifs</span>
            </div>
          </dl>
        </PanelCard>

        <PanelCard>
          <PanelHeader title="Configuration livraison" />
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de livraison</span>
              <strong>{formatPrice(restaurant.delivery_fee)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commande minimum</span>
              <strong>{formatPrice(restaurant.min_order)}</strong>
            </div>
            {restaurant.free_delivery_above && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison offerte dès</span>
                <strong>{formatPrice(restaurant.free_delivery_above)}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Délai estimé</span>
              <strong>~{restaurant.estimated_delivery_time} min</strong>
            </div>
          </dl>
        </PanelCard>
      </div>

      {/* Abonnement */}
      <PanelCard padded={false}>
        <PanelHeader
          title="Abonnement"
          description="État de l’abonnement du restaurant"
          actions={
            <Link
              href="/admin/abonnements"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Demandes
              <CreditCard className="h-3 w-3" />
            </Link>
          }
        />
        <div className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-6">
          <Badge
            variant={
              sub.isLifetime
                ? 'secondary'
                : sub.phase === 'active'
                  ? 'success'
                  : sub.phase === 'trialing'
                    ? 'warning'
                    : 'destructive'
            }
          >
            {sub.isLifetime
              ? 'Abonné à vie'
              : sub.phase === 'active'
                ? 'Abonnement actif'
                : sub.phase === 'trialing'
                  ? 'Essai gratuit'
                  : 'Expiré'}
          </Badge>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {sub.phase === 'trialing' && (
              <div>
                <dt className="text-xs text-muted-foreground">Essai restant</dt>
                <dd className="font-semibold">
                  {sub.daysLeft} jour{sub.daysLeft > 1 ? 's' : ''}
                </dd>
              </div>
            )}
            {sub.planId && (
              <div>
                <dt className="text-xs text-muted-foreground">Offre</dt>
                <dd className="font-semibold capitalize">{sub.planId}</dd>
              </div>
            )}
            {subUntil && !sub.isLifetime && (
              <div>
                <dt className="text-xs text-muted-foreground">Expire le</dt>
                <dd className="font-semibold">{subUntil}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Livreurs autorisés</dt>
              <dd className="font-semibold">
                {sub.driverLimit === null ? 'Illimités' : sub.driverLimit}
              </dd>
            </div>
          </dl>
        </div>
      </PanelCard>

      {/* Propriétaire */}
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
                  {owner.phone || 'Aucun téléphone'} · inscrit {formatRelativeTime(owner.created_at)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun propriétaire associé.</p>
          )}
        </div>
      </PanelCard>

      {/* Top plats + commandes récentes */}
      <div className="grid gap-6 md:grid-cols-2">
        <PanelCard padded={false}>
          <PanelHeader title="Top plats (30j)" description="Classement par quantité livrée" />
          {topItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun plat livré sur les 30 derniers jours.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topItems.map((it, i) => (
                <li key={it.item_name} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{it.item_name}</p>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {it.quantity}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard padded={false}>
          <PanelHeader
            title="Dernières commandes"
            actions={
              <Link
                href={`/admin/commandes?resto=${restaurant.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Voir tout
              </Link>
            }
          />
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune commande pour ce restaurant.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{o.order_number}</span> ·{' '}
                      {formatRelativeTime(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                    <span className="font-display text-sm font-bold tabular-nums">
                      {formatPrice(o.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      {/* Reviews */}
      <PanelCard padded={false}>
        <PanelHeader
          title={`Derniers avis${reviewCount > 0 ? ` (${reviewCount} au total)` : ''}`}
        />
        {reviews.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucun avis publié pour l’instant.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((r, i) => (
              <li key={i} className="px-5 py-4 md:px-6">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={
                          'h-3.5 w-3.5 ' +
                          (n <= r.rating ? 'fill-warning text-warning' : 'fill-muted text-muted')
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(Array.isArray(r.order) ? r.order[0]?.customer_name : r.order?.customer_name) ??
                      'Client'}{' '}
                    · {formatRelativeTime(r.created_at)}
                  </span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      {/* Modération */}
      <PanelCard padded={false}>
        <PanelHeader
          title="Modération"
          description="Modifier le statut du restaurant. Suspendre masque le restaurant publiquement."
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
  hint,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 truncate font-display text-xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 truncate text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
