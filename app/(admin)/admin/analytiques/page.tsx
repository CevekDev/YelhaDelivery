import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { Clock, TrendingUp, Utensils } from 'lucide-react';
import type { OrderStatus, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  restaurant_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

interface OrderItemRow {
  order_id: string;
  item_name: string;
  quantity: number;
}

export default async function AdminAnalyticsPage() {
  await requireRole('admin');
  const admin = await createClient();

  const now = new Date();
  const days = 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [{ data: orders }, { data: restaurants }] = await Promise.all([
    admin
      .from('orders')
      .select('id, restaurant_id, status, total, created_at')
      .gte('created_at', start.toISOString())
      .returns<OrderRow[]>(),
    admin
      .from('restaurants')
      .select('id, name, slug')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug'>[]>(),
  ]);

  // Top plats : uniquement à partir des commandes livrées. On dérive les ids
  // depuis `orders` déjà chargé (évite un `.in([])` invalide quand 0 livraison).
  const deliveredIds = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .map((o) => o.id);
  const itemsRows =
    deliveredIds.length > 0
      ? (
          await admin
            .from('order_items')
            .select('order_id, item_name, quantity')
            .in('order_id', deliveredIds)
            .returns<OrderItemRow[]>()
        ).data
      : [];

  const allOrders = orders ?? [];
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');
  const restoById = new Map((restaurants ?? []).map((r) => [r.id, r.name]));

  // Revenue par jour (30 derniers jours)
  const revPerDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    return { date: d, revenue: 0, orders: 0 };
  });
  for (const o of allOrders) {
    const created = new Date(o.created_at);
    const dayIdx = revPerDay.findIndex((b) => {
      const next = new Date(b.date.getTime() + 24 * 60 * 60 * 1000);
      return created >= b.date && created < next;
    });
    if (dayIdx >= 0) {
      revPerDay[dayIdx]!.orders++;
      if (o.status === 'delivered') revPerDay[dayIdx]!.revenue += Number(o.total);
    }
  }
  const maxRev = Math.max(1, ...revPerDay.map((d) => d.revenue));
  const maxOrd = Math.max(1, ...revPerDay.map((d) => d.orders));

  // Distribution par statut
  const statusCount = new Map<OrderStatus, number>();
  for (const o of allOrders) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);

  // Heures de pic
  const perHour = new Array(24).fill(0);
  for (const o of allOrders) perHour[new Date(o.created_at).getHours()]++;
  const maxHour = Math.max(1, ...perHour);

  // Top 10 plats livrés
  const itemCount = new Map<string, number>();
  for (const i of itemsRows ?? []) {
    itemCount.set(i.item_name, (itemCount.get(i.item_name) ?? 0) + i.quantity);
  }
  const topItems = [...itemCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxItemCount = Math.max(1, topItems[0]?.[1] ?? 1);

  // Top restaurants CA + orders
  const revByResto = new Map<string, number>();
  const ordersByResto = new Map<string, number>();
  for (const o of deliveredOrders) {
    revByResto.set(o.restaurant_id, (revByResto.get(o.restaurant_id) ?? 0) + Number(o.total));
    ordersByResto.set(o.restaurant_id, (ordersByResto.get(o.restaurant_id) ?? 0) + 1);
  }
  const topRestos = [...revByResto.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, rev]) => ({
      id,
      name: restoById.get(id) ?? '—',
      revenue: rev,
      orders: ordersByResto.get(id) ?? 0,
    }));

  const totalRev = deliveredOrders.reduce((s, o) => s + Number(o.total), 0);
  const avgOrder = deliveredOrders.length > 0 ? totalRev / deliveredOrders.length : 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Statistiques"
        title="Analytiques"
        description="30 derniers jours de la plateforme."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard label="CA 30 jours" value={formatPrice(totalRev)} />
        <KpiCard label="Commandes livrées" value={deliveredOrders.length.toString()} />
        <KpiCard label="Panier moyen" value={formatPrice(avgOrder)} />
        <KpiCard label="Total commandes" value={allOrders.length.toString()} />
      </div>

      {/* Chart CA par jour */}
      <PanelCard>
        <PanelHeader
          title="Chiffre d’affaires par jour"
          description="30 derniers jours · commandes livrées uniquement"
        />
        <BarChart
          bars={revPerDay.map((d) => ({
            label: d.date.getDate().toString(),
            value: d.revenue,
            display: formatPrice(d.revenue),
          }))}
          max={maxRev}
          color="var(--primary)"
        />
      </PanelCard>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart commandes par jour */}
        <PanelCard>
          <PanelHeader title="Commandes par jour" />
          <BarChart
            bars={revPerDay.map((d) => ({
              label: d.date.getDate().toString(),
              value: d.orders,
              display: d.orders.toString(),
            }))}
            max={maxOrd}
            color="var(--success)"
          />
        </PanelCard>

        {/* Heures de pic */}
        <PanelCard>
          <PanelHeader
            title="Heures de pic"
            description="Distribution horaire des commandes reçues"
          />
          <BarChart
            bars={perHour.map((v, h) => ({
              label: h.toString().padStart(2, '0'),
              value: v,
              display: v.toString(),
            }))}
            max={maxHour}
            color="var(--warning)"
          />
        </PanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top plats */}
        <PanelCard padded={false}>
          <PanelHeader
            title="Top plats"
            description="10 plats les plus commandés"
            actions={<Utensils className="h-4 w-4 text-muted-foreground" />}
          />
          {topItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun plat livré sur cette période.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topItems.map(([name, qty], i) => (
                <li key={name} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <span className="w-6 shrink-0 text-sm font-bold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(qty / maxItemCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-right text-sm font-bold tabular-nums">{qty}×</span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        {/* Top restaurants */}
        <PanelCard padded={false}>
          <PanelHeader
            title="Top restaurants"
            description="Classement CA sur 30 jours"
            actions={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          {topRestos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune livraison sur cette période.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {topRestos.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <span className="w-6 shrink-0 text-sm font-bold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="truncate text-sm font-semibold hover:text-primary"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.orders} commande{r.orders > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-bold tabular-nums">
                    {formatPrice(r.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      {/* Distribution statuts */}
      <PanelCard>
        <PanelHeader title="Distribution des statuts" description="Toutes les commandes de la période" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as OrderStatus[]).map(
            (status) => {
              const count = statusCount.get(status) ?? 0;
              const pct = allOrders.length > 0 ? Math.round((count / allOrders.length) * 100) : 0;
              return (
                <div key={status} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{ORDER_STATUS_LABELS[status]}</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{count}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
                </div>
              );
            },
          )}
        </div>
      </PanelCard>

      <p className="text-center text-xs text-muted-foreground">
        <Clock className="mr-1 inline h-3 w-3" />
        Toutes les stats sont recalculées à chaque chargement · plage {days} jours.
      </p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Bar chart SVG minimaliste, responsive. Hauteur fixe, largeur adaptative.
 * Chaque barre a un tooltip HTML natif via <title>.
 */
function BarChart({
  bars,
  max,
  color,
}: {
  bars: { label: string; value: number; display: string }[];
  max: number;
  color: string;
}) {
  const height = 160;
  const barGap = 2;
  const nBars = bars.length;
  const showEveryNthLabel = Math.max(1, Math.round(nBars / 10));

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${nBars * 20} ${height + 24}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {bars.map((b, i) => {
          const barHeight = max > 0 ? (b.value / max) * height : 0;
          const x = i * 20;
          const y = height - barHeight;
          return (
            <g key={i}>
              <rect
                x={x + barGap}
                y={y}
                width={20 - barGap * 2}
                height={Math.max(1, barHeight)}
                fill={color}
                opacity={b.value === 0 ? 0.15 : 0.9}
                rx="1"
              >
                <title>{`${b.label} — ${b.display}`}</title>
              </rect>
              {i % showEveryNthLabel === 0 && (
                <text
                  x={x + 10}
                  y={height + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="hsl(var(--text-secondary))"
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
