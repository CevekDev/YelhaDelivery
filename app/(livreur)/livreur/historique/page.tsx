import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
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

  return (
    <main className="container space-y-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Historique</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/livreur/dashboard">← Mes commandes</Link>
        </Button>
      </div>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune livraison passée.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-primary-light">{o.order_number}</p>
                    <p className="truncate text-sm font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(o.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                    <span className="text-sm font-semibold">{formatPrice(o.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
