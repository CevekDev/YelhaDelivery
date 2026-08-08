import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { ArrowLeft, History } from 'lucide-react';
import type { Order } from '@/types/database';

export const dynamic = 'force-dynamic';

const RANGE_FILTERS = [
  { key: 'today', label: "Aujourd'hui", days: 1 },
  { key: '7d', label: '7 jours', days: 7 },
  { key: '30d', label: '30 jours', days: 30 },
  { key: 'all', label: 'Tout', days: null },
] as const;

export default async function HistoriquePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { userId } = await requireRole('livreur');
  const supabase = await createClient();
  const params = await searchParams;

  const rangeKey = params.range ?? '30d';
  const rangeDef = RANGE_FILTERS.find((r) => r.key === rangeKey) ?? RANGE_FILTERS[2];

  let query = supabase
    .from('orders')
    .select('*')
    .eq('driver_id', userId)
    .in('status', ['delivered', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(200);

  if (rangeDef.days !== null) {
    const since =
      rangeDef.days === 1
        ? (() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d.toISOString();
          })()
        : new Date(Date.now() - rangeDef.days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('updated_at', since);
  }

  const { data: orders } = await query.returns<Order[]>();

  const delivered = (orders ?? []).filter((o) => o.status === 'delivered');
  const deliveredCount = delivered.length;
  const cancelledCount = (orders ?? []).filter((o) => o.status === 'cancelled').length;
  const totalCollected = delivered.reduce((s, o) => s + Number(o.total), 0);

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <header className="border-b border-ink-line bg-ink text-ink-foreground">
        <div className="container flex items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">Historique</p>
              <p className="text-xs text-ink-muted">Vos livraisons passées</p>
            </div>
          </div>
          <Link
            href="/livreur/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-line bg-ink-light px-3 py-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-line"
          >
            <ArrowLeft className="h-4 w-4" />
            Tournée
          </Link>
        </div>
      </header>

      {/* Filtre période */}
      <section className="container pt-4">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_FILTERS.map((r) => {
            const active = r.key === rangeKey;
            return (
              <Link
                key={r.key}
                href={r.key === '30d' ? '/livreur/historique' : `/livreur/historique?range=${r.key}`}
                className={
                  'inline-flex items-center rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ' +
                  (active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground')
                }
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Livrées
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">{deliveredCount}</p>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">Encaissé</p>
            <p className="mt-1 font-display text-xl font-extrabold tabular-nums">
              {formatPrice(totalCollected)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Annulées
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">{cancelledCount}</p>
          </div>
        </div>
      </section>

      <section className="container pb-10">
        {!orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-base font-bold">Aucune livraison sur cette période</p>
            <p className="mt-1 text-sm text-muted-foreground">Essayez d’élargir la période.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 shadow-card"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-primary">{o.order_number}</p>
                  <p className="truncate text-sm font-semibold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(o.updated_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
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
      </section>
    </main>
  );
}
