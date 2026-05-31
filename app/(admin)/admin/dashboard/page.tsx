import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ArrowRight, ShoppingBag, Store, TrendingUp, Users } from 'lucide-react';
import type { Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole('admin');
  const admin = await createAdminClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: restaurantsCount },
    { count: ordersTodayCount },
    { count: usersCount },
    { data: deliveredToday },
    { data: latestRestaurants },
  ] = await Promise.all([
    admin.from('restaurants').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('total')
      .eq('status', 'delivered')
      .gte('created_at', startOfDay.toISOString()),
    admin
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<Restaurant[]>(),
  ]);

  const revenueToday = (deliveredToday ?? []).reduce(
    (sum: number, o: { total: number }) => sum + Number(o.total),
    0,
  );

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Panel admin"
        title="Vue d’ensemble"
        description="Statistiques globales de la plateforme YelhaDelivery."
        actions={
          <Button asChild>
            <Link href="/admin/restaurants/nouveau">+ Créer un restaurant</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat icon={Store} label="Restaurants" value={(restaurantsCount ?? 0).toString()} />
        <Stat
          icon={ShoppingBag}
          label="Commandes aujourd'hui"
          value={(ordersTodayCount ?? 0).toString()}
        />
        <Stat icon={Users} label="Utilisateurs" value={(usersCount ?? 0).toString()} />
        <Stat icon={TrendingUp} label="CA du jour" value={formatPrice(revenueToday)} />
      </div>

      <PanelCard padded={false}>
        <PanelHeader
          title="Restaurants récemment inscrits"
          actions={
            <Link
              href="/admin/restaurants"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Voir tout
              <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        {!latestRestaurants || latestRestaurants.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucun restaurant pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {latestRestaurants.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 md:px-6"
              >
                <Link href={`/admin/restaurants/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold hover:text-primary">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /r/{r.slug} · créé {formatRelativeTime(r.created_at)}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-background p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 truncate font-display text-2xl font-extrabold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
