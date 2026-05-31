import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import {
  ShoppingBag,
  Clock,
  TrendingUp,
  ChefHat,
  Plus,
  UtensilsCrossed,
  Bike,
  Share2,
  ArrowRight,
} from 'lucide-react';
import type { Order } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const { restaurant, profile } = await requireRestaurateur();
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { data: todayOrders },
    { data: recentOrders },
    { count: pendingCount },
    { count: itemsCount },
    { count: driversCount },
    { data: etaData },
  ] = await Promise.all([
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
    supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('role', 'livreur')
      .eq('is_active', true),
    supabase.rpc('get_delivery_estimate', { p_restaurant_id: restaurant.id }),
  ]);
  const currentEta = typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time;
  const etaDelta = currentEta - restaurant.estimated_delivery_time;

  const todayCount = todayOrders?.length ?? 0;
  const todayRevenue = (todayOrders ?? [])
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const deliveredToday = (todayOrders ?? []).filter((o) => o.status === 'delivered').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = profile.full_name?.split(' ')[0] ?? 'restaurateur';

  return (
    <div className="container space-y-6 py-6 md:py-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Voici l&apos;activité de {restaurant.name} aujourd&apos;hui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/r/${restaurant.slug}`} target="_blank" rel="noreferrer">
              <Share2 className="h-4 w-4" />
              Partager mon menu
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/menu/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau plat
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Commandes aujourd'hui"
          value={todayCount.toString()}
        />
        <StatCard
          icon={Clock}
          label="À traiter"
          value={(pendingCount ?? 0).toString()}
          highlight={(pendingCount ?? 0) > 0}
        />
        <StatCard
          icon={ChefHat}
          label="Livrées aujourd'hui"
          value={deliveredToday.toString()}
        />
        <StatCard icon={TrendingUp} label="CA du jour" value={formatPrice(todayRevenue)} />
      </div>

      {/* ETA dynamique */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Temps de livraison affiché
            </p>
            <p className="mt-0.5 font-display text-xl font-extrabold">
              ~{currentEta} <span className="text-sm font-normal text-muted-foreground">min</span>
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          {etaDelta === 0 ? (
            <span className="text-muted-foreground">
              = baseline ({restaurant.estimated_delivery_time} min)
            </span>
          ) : etaDelta > 0 ? (
            <span className="text-warning">
              +{etaDelta} min vs baseline ({restaurant.estimated_delivery_time} min)
            </span>
          ) : (
            <span className="text-success">
              {etaDelta} min vs baseline ({restaurant.estimated_delivery_time} min)
            </span>
          )}
          <p className="mt-1 text-muted-foreground">
            Recalculé sur les 30 derniers jours
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Commandes récentes */}
        <section className="rounded-2xl border border-border bg-background shadow-card">
          <header className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="font-display text-lg font-bold">Dernières commandes</h2>
              <p className="text-xs text-muted-foreground">Les 5 plus récentes</p>
            </div>
            <Link
              href="/dashboard/commandes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Voir tout
              <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-2">
            {!recentOrders || recentOrders.length === 0 ? (
              <EmptyOrders slug={restaurant.slug} />
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{o.customer_name}</p>
                        <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        <span className="font-mono">{o.order_number}</span> ·{' '}
                        {formatRelativeTime(o.created_at)} · {o.customer_phone}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-sm font-bold tabular-nums">
                      {formatPrice(o.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Side panel — Quick stats + actions */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
            <h3 className="font-display text-base font-bold">Configuration</h3>
            <div className="mt-4 space-y-3">
              <ConfigRow
                icon={UtensilsCrossed}
                label="Plats au menu"
                value={itemsCount ?? 0}
                href="/dashboard/menu"
                empty={!itemsCount}
                emptyLabel="Ajouter mon premier plat"
              />
              <ConfigRow
                icon={Bike}
                label="Livreurs actifs"
                value={driversCount ?? 0}
                href="/dashboard/livreurs"
                empty={!driversCount}
                emptyLabel="Ajouter un livreur"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 p-5 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Astuce
            </p>
            <p className="mt-2 font-display text-base font-bold leading-snug">
              Partagez votre lien sur Instagram
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoutez{' '}
              <code className="rounded bg-background px-1 py-0.5 text-[10px]">
                yelha-delivery.vercel.app/r/{restaurant.slug}
              </code>{' '}
              dans votre bio pour transformer vos abonnés en clients.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'group rounded-2xl border bg-background p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ' +
        (highlight ? 'border-warning/40 ring-2 ring-warning/10' : 'border-border')
      }
    >
      <div className="flex items-center justify-between">
        <div
          className={
            'flex h-9 w-9 items-center justify-center rounded-xl ' +
            (highlight ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary')
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        {highlight && (
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-warning" />
        )}
      </div>
      <p className="mt-3 truncate font-display text-2xl font-extrabold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ConfigRow({
  icon: Icon,
  label,
  value,
  href,
  empty,
  emptyLabel,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
  href: string;
  empty: boolean;
  emptyLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {empty ? (
          <p className="truncate text-sm font-semibold text-primary">{emptyLabel}</p>
        ) : (
          <p className="truncate font-display text-base font-bold">{value}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function EmptyOrders({ slug }: { slug: string }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 font-display text-base font-semibold">Aucune commande pour l&apos;instant</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Partagez votre lien pour recevoir vos premières commandes.
      </p>
      <Link
        href={`/r/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Voir ma page publique
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
