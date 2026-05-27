import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { ShoppingBag, Clock, TrendingUp, ChefHat } from 'lucide-react';
import type { Order } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  // Stats du jour : commandes du restaurant créées aujourd'hui (UTC -> on accepte la dérive)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: todayOrders }, { data: recentOrders }, { count: pendingCount }] = await Promise.all([
    supabase
      .from('orders')
      .select('total, status')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', startOfDay.toISOString())
      .returns<Pick<Order, 'total' | 'status'>[]>(),
    supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<Order[]>(),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'pending'),
  ]);

  const todayCount = todayOrders?.length ?? 0;
  const todayRevenue = (todayOrders ?? [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const deliveredToday = (todayOrders ?? []).filter((o) => o.status === 'delivered').length;

  return (
    <div className="container space-y-6 py-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Commandes aujourd'hui"
          value={todayCount.toString()}
        />
        <StatCard
          icon={Clock}
          label="En attente"
          value={(pendingCount ?? 0).toString()}
          accent={pendingCount && pendingCount > 0 ? 'warning' : undefined}
        />
        <StatCard icon={ChefHat} label="Livrées aujourd'hui" value={deliveredToday.toString()} />
        <StatCard icon={TrendingUp} label="CA aujourd'hui" value={formatPrice(todayRevenue)} />
      </div>

      {/* Commandes récentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>Les 5 dernières commandes reçues</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/commandes">Voir tout</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune commande pour le moment. Partagez votre menu :{' '}
              <Link
                href={`/r/${restaurant.slug}`}
                className="text-primary hover:underline"
                target="_blank"
              >
                /r/{restaurant.slug}
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {o.order_number} · {o.customer_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatRelativeTime(o.created_at)} · {o.customer_phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm font-semibold sm:inline">
                      {formatPrice(o.total)}
                    </span>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
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

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  accent?: 'warning';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={
            accent === 'warning'
              ? 'rounded-md bg-warning/15 p-2 text-warning'
              : 'rounded-md bg-primary/15 p-2 text-primary'
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
