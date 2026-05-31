import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { ArrowLeft, History } from 'lucide-react';
import type { Order } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HistoriquePage() {
  const { userId } = await requireRole('livreur');
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('driver_id', userId)
    .in('status', ['delivered', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(100)
    .returns<Order[]>();

  const deliveredCount = orders?.filter((o) => o.status === 'delivered').length ?? 0;
  const totalCollected = (orders ?? [])
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <header className="border-b border-border bg-background">
        <div className="container flex items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">Historique</p>
              <p className="text-xs text-muted-foreground">100 dernières livraisons</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/livreur/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Tournée
            </Link>
          </Button>
        </div>
      </header>

      <section className="container py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Livrées
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">{deliveredCount}</p>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">
              Total encaissé
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
              {formatPrice(totalCollected)}
            </p>
          </div>
        </div>
      </section>

      <section className="container pb-10">
        {!orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-base font-bold">Aucune livraison passée</p>
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
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(o.updated_at)}
                  </p>
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
