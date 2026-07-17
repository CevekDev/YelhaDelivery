import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Minus,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Order, OrderStatus, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface OrderLite {
  id: string;
  order_number: string;
  restaurant_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name: string;
}

export default async function AdminDashboard() {
  await requireRole('admin');
  const admin = await createClient();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pendingSlaMinutes = 30;
  const pendingCutoff = new Date(now.getTime() - pendingSlaMinutes * 60 * 1000);

  const [
    { count: restaurantsCount },
    { count: activeRestaurantsCount },
    { count: suspendedCount },
    { data: pendingRestaurants },
    { count: usersCount },
    { data: last14dOrders },
    { data: last30dOrders },
    { data: recentOrders },
    { data: pendingOrders },
    { data: allRestaurants },
  ] = await Promise.all([
    admin.from('restaurants').select('*', { count: 'exact', head: true }),
    admin.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    admin
      .from('restaurants')
      .select('id, name, slug, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('id, restaurant_id, status, total, created_at')
      .gte('created_at', last14d.toISOString())
      .returns<Pick<Order, 'id' | 'restaurant_id' | 'status' | 'total' | 'created_at'>[]>(),
    admin
      .from('orders')
      .select('restaurant_id, status, total, created_at')
      .gte('created_at', last30d.toISOString())
      .eq('status', 'delivered')
      .returns<Pick<Order, 'restaurant_id' | 'status' | 'total' | 'created_at'>[]>(),
    admin
      .from('orders')
      .select('id, order_number, restaurant_id, status, total, created_at, customer_name')
      .order('created_at', { ascending: false })
      .limit(8)
      .returns<OrderLite[]>(),
    admin
      .from('orders')
      .select('id, order_number, restaurant_id, created_at, customer_name, total')
      .eq('status', 'pending')
      .lt('created_at', pendingCutoff.toISOString())
      .order('created_at', { ascending: true })
      .limit(5),
    admin
      .from('restaurants')
      .select('id, name, slug, status')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug' | 'status'>[]>(),
  ]);

  const orders14d = last14dOrders ?? [];
  const orders7d = orders14d.filter((o) => new Date(o.created_at) >= last7d);
  const ordersPrev7d = orders14d.filter((o) => new Date(o.created_at) < last7d);

  const revenue = (list: typeof orders14d) =>
    list.filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0);

  const rev7d = revenue(orders7d);
  const revPrev7d = revenue(ordersPrev7d);
  const revTrend = trend(rev7d, revPrev7d);

  const ord7d = orders7d.length;
  const ordPrev7d = ordersPrev7d.length;
  const ordTrend = trend(ord7d, ordPrev7d);

  const ordersToday = orders7d.filter((o) => new Date(o.created_at) >= startOfDay);
  const revenueToday = revenue(ordersToday);

  // Top 5 restaurants par CA sur 30j
  const restoNameById = new Map(
    (allRestaurants ?? []).map((r) => [r.id, { name: r.name, slug: r.slug, status: r.status }]),
  );
  const revByResto = new Map<string, number>();
  const ordersByResto = new Map<string, number>();
  for (const o of last30dOrders ?? []) {
    revByResto.set(o.restaurant_id, (revByResto.get(o.restaurant_id) ?? 0) + Number(o.total));
    ordersByResto.set(o.restaurant_id, (ordersByResto.get(o.restaurant_id) ?? 0) + 1);
  }
  const topRestos = [...revByResto.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, rev]) => ({
      id,
      name: restoNameById.get(id)?.name ?? '—',
      slug: restoNameById.get(id)?.slug ?? '',
      revenue: rev,
      orders: ordersByResto.get(id) ?? 0,
    }));

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Panel admin"
        title="Vue d’ensemble"
        description="Activité globale de la plateforme YelhaDelivery — comparaison 7j vs 7j précédents."
      />

      {/* Demandes d'activation — nouveaux restaurateurs en attente */}
      {(pendingRestaurants?.length ?? 0) > 0 && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              ⏳
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">
                {pendingRestaurants!.length} restaurant{pendingRestaurants!.length > 1 ? 's' : ''} en
                attente d’activation
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Validez leur compte pour mettre leur site en ligne.
              </p>
              <ul className="mt-3 space-y-2">
                {pendingRestaurants!.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /r/{r.slug} · inscrit {formatRelativeTime(r.created_at)}
                      </span>
                    </span>
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-dark"
                    >
                      Examiner & activer
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Alertes prioritaires */}
      {((pendingOrders?.length ?? 0) > 0 || (suspendedCount ?? 0) > 0) && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              {(pendingOrders?.length ?? 0) > 0 && (
                <p>
                  <strong>{pendingOrders!.length} commande{pendingOrders!.length > 1 ? 's' : ''}</strong>{' '}
                  en attente depuis plus de {pendingSlaMinutes} min.{' '}
                  <Link href="/admin/commandes?status=pending" className="font-semibold underline">
                    Voir la liste
                  </Link>
                </p>
              )}
              {(suspendedCount ?? 0) > 0 && (
                <p>
                  <strong>{suspendedCount} restaurant{suspendedCount! > 1 ? 's' : ''} suspendu{suspendedCount! > 1 ? 's' : ''}</strong>.{' '}
                  <Link href="/admin/restaurants" className="font-semibold underline">
                    Vérifier
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs 4 cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={TrendingUp}
          label="CA sur 7 jours"
          value={formatPrice(rev7d)}
          subtitle={`Aujourd’hui : ${formatPrice(revenueToday)}`}
          trend={revTrend}
        />
        <StatCard
          icon={ShoppingBag}
          label="Commandes 7 jours"
          value={ord7d.toString()}
          subtitle={`Aujourd’hui : ${ordersToday.length}`}
          trend={ordTrend}
        />
        <StatCard
          icon={Store}
          label="Restaurants"
          value={(activeRestaurantsCount ?? 0).toString()}
          subtitle={`${restaurantsCount ?? 0} au total`}
        />
        <StatCard
          icon={Users}
          label="Comptes"
          value={(usersCount ?? 0).toString()}
          subtitle="Restaurateurs · livreurs · admins"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Top restaurants */}
        <PanelCard padded={false}>
          <PanelHeader
            title="Top restaurants — 30 derniers jours"
            description="Classement par chiffre d’affaires livré"
            actions={
              <Link
                href="/admin/analytiques"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Analytiques
                <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {topRestos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune commande livrée sur les 30 derniers jours.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topRestos.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3 md:px-6">
                  <span className="w-6 shrink-0 font-display text-lg font-extrabold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="truncate font-semibold hover:text-primary"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.orders} commande{r.orders > 1 ? 's' : ''} livrée{r.orders > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-right font-display text-sm font-bold tabular-nums">
                    {formatPrice(r.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        {/* Commandes récentes */}
        <PanelCard padded={false}>
          <PanelHeader
            title="Dernières commandes"
            actions={
              <Link
                href="/admin/commandes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Aucune commande pour l’instant.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => {
                const resto = restoNameById.get(o.restaurant_id);
                return (
                  <li key={o.id} className="px-5 py-3 hover:bg-muted/40 md:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{o.customer_name}</p>
                      <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        <span className="font-mono">{o.order_number}</span> ·{' '}
                        {resto?.name ?? '—'}
                      </span>
                      <span className="shrink-0 font-semibold text-foreground tabular-nums">
                        {formatPrice(o.total)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelativeTime(o.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function trend(current: number, previous: number): { pct: number | null; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { pct: current > 0 ? null : 0, direction: current > 0 ? 'up' : 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, direction: 'flat' };
  return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : 'down' };
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  subtitle?: string;
  trend?: { pct: number | null; direction: 'up' | 'down' | 'flat' };
}) {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-success'
      : trend?.direction === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';
  const TrendIcon = trend?.direction === 'up' ? ArrowUp : trend?.direction === 'down' ? ArrowDown : Minus;
  return (
    <div className="group rounded-2xl border border-border bg-background p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {trend.pct === null ? 'nouveau' : `${trend.pct}%`}
          </span>
        )}
      </div>
      <p className="mt-3 truncate font-display text-2xl font-extrabold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
      {subtitle && <p className="mt-1 truncate text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
