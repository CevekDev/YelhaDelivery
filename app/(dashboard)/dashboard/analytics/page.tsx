import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { BarChart2, ShoppingBag, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface OrderRow {
  id: string;
  total: number;
  created_at: string;
}

interface ItemRow {
  item_name: string;
  quantity: number;
}

export default async function AnalyticsPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch orders (last 30 days, non-cancelled)
  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('id, total, created_at')
    .eq('restaurant_id', restaurant.id)
    .neq('status', 'cancelled')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at')
    .returns<OrderRow[]>();

  const allOrders: OrderRow[] = ordersRaw ?? [];
  const orderIds = allOrders.map((o) => o.id);

  // Fetch order items for those orders
  const { data: itemsRaw } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('item_name, quantity')
        .in('order_id', orderIds)
        .returns<ItemRow[]>()
    : { data: [] as ItemRow[] };

  const allItems: ItemRow[] = itemsRaw ?? [];

  // KPIs
  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItemsSold = allItems.reduce((s, i) => s + i.quantity, 0);

  // Revenue by day
  const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const o of allOrders) {
    const date = o.created_at.slice(0, 10);
    const existing = dailyMap.get(date) ?? { date, revenue: 0, orders: 0 };
    dailyMap.set(date, {
      date,
      revenue: existing.revenue + Number(o.total),
      orders: existing.orders + 1,
    });
  }
  const dailyStats = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const maxRevenue = Math.max(...dailyStats.map((d) => d.revenue), 1);

  // Revenue by day of week
  const dowMap = new Map<number, { revenue: number; orders: number }>();
  for (let i = 0; i < 7; i++) dowMap.set(i, { revenue: 0, orders: 0 });
  for (const o of allOrders) {
    const dow = new Date(o.created_at).getDay();
    const s = dowMap.get(dow)!;
    dowMap.set(dow, { revenue: s.revenue + Number(o.total), orders: s.orders + 1 });
  }
  const maxDow = Math.max(...[...dowMap.values()].map((v) => v.revenue), 1);

  // Top items
  const itemMap = new Map<string, number>();
  for (const item of allItems) {
    itemMap.set(item.item_name, (itemMap.get(item.item_name) ?? 0) + item.quantity);
  }
  const topItems = [...itemMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxQty = Math.max(...topItems.map(([, q]) => q), 1);

  const kpiCards = [
    {
      label: 'Chiffre d\'affaires (30j)',
      value: formatPrice(totalRevenue),
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Commandes (30j)',
      value: String(totalOrders),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Panier moyen',
      value: formatPrice(avgOrder),
      icon: BarChart2,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Articles vendus',
      value: String(totalItemsSold),
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="container max-w-5xl space-y-8 py-6 md:py-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Analytiques"
        description="Vos performances sur les 30 derniers jours."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${k.bg}`}>
                  <Icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalOrders === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-muted-foreground">Aucune donnée disponible</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les statistiques apparaîtront dès que des commandes sont passées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Revenue by day chart */}
          {dailyStats.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="mb-4 text-sm font-semibold">Chiffre d&apos;affaires par jour</p>
                <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
                  {dailyStats.map((d) => {
                    const pct = (d.revenue / maxRevenue) * 100;
                    const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-DZ', {
                      day: '2-digit',
                      month: 'short',
                    });
                    return (
                      <div key={d.date} className="group flex flex-1 min-w-[28px] flex-col items-center gap-1">
                        <span className="hidden text-[10px] text-muted-foreground group-hover:block whitespace-nowrap">
                          {formatPrice(d.revenue)}
                        </span>
                        <div
                          className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                          style={{ height: `${Math.max(4, (pct / 100) * 100)}px`, maxHeight: 100 }}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Par jour de la semaine */}
            <Card>
              <CardContent className="p-5">
                <p className="mb-4 text-sm font-semibold">Répartition par jour de la semaine</p>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                    const s = dowMap.get(dow)!;
                    const pct = maxDow > 0 ? (s.revenue / maxDow) * 100 : 0;
                    return (
                      <div key={dow} className="flex items-center gap-3 text-sm">
                        <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground">
                          {DAY_LABELS[dow]}
                        </span>
                        <div className="flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-5 rounded-full bg-primary/70 transition-all"
                            style={{ width: `${Math.max(pct, 0)}%` }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {s.orders > 0 ? formatPrice(s.revenue) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top items */}
            <Card>
              <CardContent className="p-5">
                <p className="mb-4 text-sm font-semibold">Plats les plus commandés</p>
                {topItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
                ) : (
                  <div className="space-y-2">
                    {topItems.map(([name, qty]) => {
                      const pct = (qty / maxQty) * 100;
                      return (
                        <div key={name} className="flex items-center gap-3 text-sm">
                          <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="flex h-6 items-center rounded-full bg-primary/60 px-2 transition-all"
                              style={{ width: `${Math.max(pct, 5)}%` }}
                            >
                              <span className="truncate text-[10px] font-semibold text-primary-foreground/90">
                                {name}
                              </span>
                            </div>
                          </div>
                          <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">
                            ×{qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
