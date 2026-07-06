import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { Bike, Phone, Shield, Store, UserRound } from 'lucide-react';
import type { Order, Profile, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface ClientAggregate {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  restaurants: Set<string>;
}

export default async function AdminUtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  await requireRole('admin');
  const params = await searchParams;
  const segment = (params.segment ?? 'clients') as
    | 'clients'
    | 'restaurateurs'
    | 'livreurs'
    | 'admins';
  const admin = await createAdminClient();

  const [
    { data: profiles },
    { data: restaurants },
    { data: last90dOrders },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<Profile[]>(),
    admin
      .from('restaurants')
      .select('id, name, slug, owner_id')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug' | 'owner_id'>[]>(),
    admin
      .from('orders')
      .select('id, status, total, created_at, customer_name, customer_phone, restaurant_id, driver_id')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .returns<
        Pick<
          Order,
          | 'id'
          | 'status'
          | 'total'
          | 'created_at'
          | 'customer_name'
          | 'customer_phone'
          | 'restaurant_id'
          | 'driver_id'
        >[]
      >(),
  ]);

  const profs = profiles ?? [];
  const orders = last90dOrders ?? [];

  const admins = profs.filter((p) => p.role === 'admin');
  const restaurateurs = profs.filter((p) => p.role === 'restaurateur');
  const livreurs = profs.filter((p) => p.role === 'livreur');

  const restoByOwner = new Map(
    (restaurants ?? [])
      .filter((r) => r.owner_id)
      .map((r) => [r.owner_id!, r]),
  );

  // Agrégation clients depuis les commandes (pas dans profiles)
  const clientsMap = new Map<string, ClientAggregate>();
  for (const o of orders) {
    const key = o.customer_phone;
    if (!key) continue;
    const cur = clientsMap.get(key) ?? {
      phone: key,
      name: o.customer_name,
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: o.created_at,
      restaurants: new Set<string>(),
    };
    cur.orderCount++;
    if (o.status === 'delivered') cur.totalSpent += Number(o.total);
    if (o.created_at > cur.lastOrderAt) {
      cur.lastOrderAt = o.created_at;
      cur.name = o.customer_name;
    }
    cur.restaurants.add(o.restaurant_id);
    clientsMap.set(key, cur);
  }
  const clients = [...clientsMap.values()].sort((a, b) => b.orderCount - a.orderCount);

  // Stats livreur : nb livraisons + CA délivré total
  const driverStats = new Map<string, { delivered: number; totalRevenue: number }>();
  for (const o of orders) {
    if (!o.driver_id || o.status !== 'delivered') continue;
    const s = driverStats.get(o.driver_id) ?? { delivered: 0, totalRevenue: 0 };
    s.delivered++;
    s.totalRevenue += Number(o.total);
    driverStats.set(o.driver_id, s);
  }

  // Stats restaurateur : CA de son resto sur 90j
  const revByResto = new Map<string, number>();
  const ordersByResto = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    revByResto.set(o.restaurant_id, (revByResto.get(o.restaurant_id) ?? 0) + Number(o.total));
    ordersByResto.set(o.restaurant_id, (ordersByResto.get(o.restaurant_id) ?? 0) + 1);
  }

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description="Clients, restaurateurs, livreurs et administrateurs de la plateforme."
      />

      {/* Onglets segments */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SegmentTab
          href="/admin/utilisateurs?segment=clients"
          active={segment === 'clients'}
          icon={UserRound}
          label="Clients"
          count={clients.length}
        />
        <SegmentTab
          href="/admin/utilisateurs?segment=restaurateurs"
          active={segment === 'restaurateurs'}
          icon={Store}
          label="Restaurateurs"
          count={restaurateurs.length}
        />
        <SegmentTab
          href="/admin/utilisateurs?segment=livreurs"
          active={segment === 'livreurs'}
          icon={Bike}
          label="Livreurs"
          count={livreurs.length}
        />
        <SegmentTab
          href="/admin/utilisateurs?segment=admins"
          active={segment === 'admins'}
          icon={Shield}
          label="Admins"
          count={admins.length}
        />
      </div>

      {segment === 'clients' && (
        <PanelCard padded={false}>
          <PanelHeader
            title={`Clients (${clients.length})`}
            description="Agrégés depuis les commandes (90 derniers jours) · classés par volume"
          />
          {clients.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun client sur les 90 derniers jours.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {clients.slice(0, 100).map((c) => (
                <li key={c.phone} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                      <span>·</span>
                      <span>
                        {c.restaurants.size} resto{c.restaurants.size > 1 ? 's' : ''} · dernière{' '}
                        {formatRelativeTime(c.lastOrderAt)}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-base font-bold tabular-nums">
                      {c.orderCount}×
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatPrice(c.totalSpent)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      )}

      {segment === 'restaurateurs' && (
        <PanelCard padded={false}>
          <PanelHeader
            title={`Restaurateurs (${restaurateurs.length})`}
            description="Comptes propriétaires · CA sur 90 jours"
          />
          {restaurateurs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun restaurateur.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {restaurateurs.map((r) => {
                const resto = restoByOwner.get(r.id);
                const rev = resto ? revByResto.get(resto.id) ?? 0 : 0;
                const ord = resto ? ordersByResto.get(resto.id) ?? 0 : 0;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(r.full_name || r.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.full_name || r.username || r.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {resto ? (
                          <Link
                            href={`/admin/restaurants/${resto.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {resto.name}
                          </Link>
                        ) : (
                          <span className="italic">Sans restaurant</span>
                        )}{' '}
                        · inscrit {formatRelativeTime(r.created_at)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-xs text-muted-foreground">CA 90j</p>
                      <p className="font-display text-sm font-bold tabular-nums">
                        {formatPrice(rev)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ord} livrée{ord > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={r.is_active ? 'success' : 'secondary'}>
                      {r.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>
      )}

      {segment === 'livreurs' && (
        <PanelCard padded={false}>
          <PanelHeader
            title={`Livreurs (${livreurs.length})`}
            description="Livraisons effectuées sur 90 jours"
          />
          {livreurs.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucun livreur.</p>
          ) : (
            <ul className="divide-y divide-border">
              {livreurs.map((l) => {
                const stats = driverStats.get(l.id);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                      <Bike className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.full_name || l.username || l.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.username && `@${l.username} · `}inscrit {formatRelativeTime(l.created_at)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-xs text-muted-foreground">Livrées 90j</p>
                      <p className="font-display text-sm font-bold tabular-nums">
                        {stats?.delivered ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {formatPrice(stats?.totalRevenue ?? 0)}
                      </p>
                    </div>
                    <Badge variant={l.is_active ? 'success' : 'secondary'}>
                      {l.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>
      )}

      {segment === 'admins' && (
        <PanelCard padded={false}>
          <PanelHeader title={`Administrateurs (${admins.length})`} />
          <ul className="divide-y divide-border">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.full_name || a.username || a.id}</p>
                  <p className="text-xs text-muted-foreground">
                    inscrit {formatRelativeTime(a.created_at)}
                  </p>
                </div>
                <Badge variant="destructive">Super admin</Badge>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
    </div>
  );
}

function SegmentTab({
  href,
  active,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: typeof Store;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ' +
        (active
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
      <span
        className={
          'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ' +
          (active ? 'bg-primary text-primary-foreground' : 'bg-muted')
        }
      >
        {count}
      </span>
    </Link>
  );
}
