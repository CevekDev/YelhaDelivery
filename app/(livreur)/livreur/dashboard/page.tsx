import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT } from '@/lib/order-status';
import { LivreurActions } from './livreur-actions';
import { LivreurRealtime } from './livreur-realtime';
import { Bike, LogOut, MapPin, Phone, Banknote, History } from 'lucide-react';
import type { Order, Restaurant } from '@/types/database';

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
        .select('name')
        .eq('id', profile.restaurant_id)
        .maybeSingle<Pick<Restaurant, 'name'>>()
    : { data: null };

  const total = orders?.length ?? 0;
  const totalCash = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <LivreurRealtime userId={userId} />
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container flex items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bike className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {restaurant?.name ?? 'Livreur'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/livreur/historique">
                <History className="h-4 w-4" />
                Historique
              </Link>
            </Button>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                aria-label="Déconnexion"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Stats du jour */}
      <section className="container py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tournée du jour
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {total} <span className="text-sm font-normal text-muted-foreground">à livrer</span>
            </p>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success/5 p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-wider text-success">
              À encaisser
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
              {formatPrice(totalCash)}
            </p>
          </div>
        </div>
      </section>

      <section className="container space-y-3 pb-10">
        <h2 className="px-1 font-display text-lg font-bold">Vos commandes</h2>

        {!orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background py-16 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Bike className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-base font-bold">Aucune commande assignée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Le restaurant vous assignera vos prochaines courses ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="overflow-hidden rounded-2xl border border-border bg-background shadow-card"
              >
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-primary">
                        {o.order_number}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-bold">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Reçue {formatRelativeTime(o.created_at)}
                      </p>
                    </div>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    <a
                      href={`tel:${o.customer_phone}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 hover:bg-muted"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Phone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Appeler le client
                        </p>
                        <p className="font-semibold">{o.customer_phone}</p>
                      </div>
                    </a>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(o.customer_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 hover:bg-muted"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Adresse · ouvrir dans Maps
                        </p>
                        <p className="font-semibold leading-snug">{o.customer_address}</p>
                      </div>
                    </a>
                  </div>

                  {o.notes && (
                    <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-sm italic">
                      💬 « {o.notes} »
                    </p>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-success/10 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-success">
                      <Banknote className="h-4 w-4" />À encaisser cash
                    </span>
                    <span className="font-display text-lg font-extrabold tabular-nums">
                      {formatPrice(o.total)}
                    </span>
                  </div>

                  <LivreurActions orderId={o.id} status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
