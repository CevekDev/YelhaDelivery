import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { LivreurActions } from './livreur-actions';
import { Phone, MapPin, LogOut } from 'lucide-react';
import type { Order, Restaurant } from '@/types/database';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LivreurDashboardPage() {
  const { profile, userId } = await requireRole('livreur');
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('driver_id', userId)
    .in('status', ['assigned', 'on_the_way'])
    .order('created_at', { ascending: false })
    .returns<Order[]>();

  const { data: restaurant } = profile.restaurant_id
    ? await supabase
        .from('restaurants')
        .select('name, phone')
        .eq('id', profile.restaurant_id)
        .maybeSingle<Pick<Restaurant, 'name' | 'phone'>>()
    : { data: null };

  return (
    <main className="min-h-screen pb-10">
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">{profile.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {restaurant?.name ? `${restaurant.name}` : 'Livreur'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/livreur/historique">Historique</Link>
            </Button>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                aria-label="Déconnexion"
                className="rounded-md border border-border p-2 text-muted-foreground hover:bg-input"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container space-y-4 py-6">
        <h1 className="font-display text-xl font-bold">Mes commandes ({orders?.length ?? 0})</h1>

        {!orders || orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucune commande assignée pour le moment.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-primary-light">
                          {o.order_number}
                        </p>
                        <p className="font-medium">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(o.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                        <p className="font-display text-lg font-bold">{formatPrice(o.total)}</p>
                      </div>
                    </div>

                    <a
                      href={`tel:${o.customer_phone}`}
                      className="flex items-center gap-2 rounded-md bg-input px-3 py-2 text-sm hover:bg-card"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{o.customer_phone}</span>
                    </a>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(o.customer_address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {o.customer_address}
                      </a>
                    </div>

                    {o.notes && (
                      <p className="rounded-md bg-input px-3 py-2 text-xs italic text-muted-foreground">
                        « {o.notes} »
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      💵 À encaisser cash :{' '}
                      <strong className="text-foreground">{formatPrice(o.total)}</strong>
                    </p>

                    <LivreurActions orderId={o.id} status={o.status} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
