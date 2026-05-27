import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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

  return (
    <div className="container space-y-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Commandes</h1>
        <p className="text-sm text-muted-foreground">Mises à jour en direct.</p>
      </div>
      <OrdersLive
        restaurantId={restaurant.id}
        initialOrders={orders ?? []}
        drivers={drivers ?? []}
      />
    </div>
  );
}
