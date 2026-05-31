import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { OrdersLive } from '@/components/dashboard/orders-live';
import type { Order, Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function CommandesPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: orders }, { data: drivers }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<Order[]>(),
    supabase
      .from('profiles')
      .select('id, full_name, username')
      .eq('restaurant_id', restaurant.id)
      .eq('role', 'livreur')
      .eq('is_active', true)
      .returns<Pick<Profile, 'id' | 'full_name' | 'username'>[]>(),
  ]);

  const activeCount =
    orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length ?? 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Activité"
        title="Commandes"
        description={
          <span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
              Mises à jour en direct
            </span>{' '}
            · {activeCount} en cours · {orders?.length ?? 0} au total
          </span>
        }
      />
      <OrdersLive
        restaurantId={restaurant.id}
        initialOrders={orders ?? []}
        drivers={drivers ?? []}
      />
    </div>
  );
}
