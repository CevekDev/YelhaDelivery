import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { Package, ShoppingBag } from 'lucide-react';
import type { Order, OrderStatus, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
  'cancelled',
];

const RANGE_FILTERS = [
  { key: 'today', label: "Aujourd'hui", days: 1 },
  { key: '7d', label: '7 derniers jours', days: 7 },
  { key: '30d', label: '30 derniers jours', days: 30 },
  { key: 'all', label: 'Tout', days: null },
] as const;

export default async function AdminCommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string; resto?: string }>;
}) {
  await requireRole('admin');
  const admin = await createAdminClient();
  const params = await searchParams;

  const statusFilter =
    STATUS_FILTERS.includes((params.status ?? 'all') as OrderStatus | 'all')
      ? ((params.status ?? 'all') as OrderStatus | 'all')
      : 'all';
  const rangeKey = params.range ?? '7d';
  const rangeDef = RANGE_FILTERS.find((r) => r.key === rangeKey) ?? RANGE_FILTERS[1];
  const restoIdFilter = params.resto ?? 'all';

  let ordersQuery = admin
    .from('orders')
    .select(
      'id, order_number, restaurant_id, status, total, created_at, customer_name, customer_phone, customer_address',
    )
    .order('created_at', { ascending: false })
    .limit(300);

  if (statusFilter !== 'all') {
    ordersQuery = ordersQuery.eq('status', statusFilter);
  }
  if (rangeDef.days !== null) {
    const since = new Date(Date.now() - rangeDef.days * 24 * 60 * 60 * 1000).toISOString();
    ordersQuery = ordersQuery.gte('created_at', since);
  }
  if (restoIdFilter !== 'all') {
    ordersQuery = ordersQuery.eq('restaurant_id', restoIdFilter);
  }

  const [{ data: orders }, { data: restaurants }] = await Promise.all([
    ordersQuery.returns<
      Pick<
        Order,
        | 'id'
        | 'order_number'
        | 'restaurant_id'
        | 'status'
        | 'total'
        | 'created_at'
        | 'customer_name'
        | 'customer_phone'
        | 'customer_address'
      >[]
    >(),
    admin
      .from('restaurants')
      .select('id, name, slug')
      .order('name')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug'>[]>(),
  ]);

  const restoById = new Map((restaurants ?? []).map((r) => [r.id, r]));
  const totalRevenue = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Activité"
        title="Toutes les commandes"
        description={`${orders?.length ?? 0} commande${(orders?.length ?? 0) > 1 ? 's' : ''} · ${formatPrice(totalRevenue)} livré${(orders?.length ?? 0) > 1 ? 's' : ''}`}
      />

      {/* Filtres */}
      <div className="space-y-3">
        <FilterRow label="Période">
          {RANGE_FILTERS.map((r) => (
            <FilterChip
              key={r.key}
              href={buildHref({ ...params, range: r.key })}
              active={r.key === rangeKey}
            >
              {r.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Statut">
          {STATUS_FILTERS.map((s) => (
            <FilterChip
              key={s}
              href={buildHref({ ...params, status: s })}
              active={s === statusFilter}
            >
              {s === 'all' ? 'Tous' : ORDER_STATUS_LABELS[s as OrderStatus]}
            </FilterChip>
          ))}
        </FilterRow>
        {(restaurants?.length ?? 0) > 1 && (
          <FilterRow label="Restaurant">
            <FilterChip
              href={buildHref({ ...params, resto: 'all' })}
              active={restoIdFilter === 'all'}
            >
              Tous
            </FilterChip>
            {(restaurants ?? []).map((r) => (
              <FilterChip
                key={r.id}
                href={buildHref({ ...params, resto: r.id })}
                active={restoIdFilter === r.id}
              >
                {r.name}
              </FilterChip>
            ))}
          </FilterRow>
        )}
      </div>

      <PanelCard padded={false}>
        <PanelHeader title={`Résultat (${orders?.length ?? 0})`} />
        {!orders || orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-bold">Aucune commande</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez d’élargir la période ou de retirer un filtre.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => {
              const r = restoById.get(o.restaurant_id);
              return (
                <li key={o.id} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40 md:px-6">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{o.customer_name}</p>
                      <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{o.order_number}</span> ·{' '}
                      {r ? (
                        <Link
                          href={`/admin/restaurants/${r.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      · {formatRelativeTime(o.created_at)} · {o.customer_phone}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.customer_address}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-right font-display text-sm font-bold tabular-nums">
                    {formatPrice(o.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== 'all') q.set(k, v);
  }
  const s = q.toString();
  return `/admin/commandes${s ? `?${s}` : ''}`;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
        (active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground')
      }
    >
      {children}
    </Link>
  );
}
