import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BottomNav, Sidebar } from '@/components/dashboard/sidebar';
import { Badge } from '@/components/ui/badge';
import type { Restaurant } from '@/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole('restaurateur');
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle<Restaurant>();

  const restaurantName = restaurant?.name ?? 'Configuration initiale';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar restaurantName={restaurantName} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold">{restaurantName}</h1>
            {restaurant && (
              <>
                <Badge variant={restaurant.is_open ? 'success' : 'secondary'}>
                  {restaurant.is_open ? 'Ouvert' : 'Fermé'}
                </Badge>
                {!restaurant.accept_orders && <Badge variant="warning">Commandes désactivées</Badge>}
              </>
            )}
          </div>
        </header>
        {restaurant?.status === 'suspended' && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-6">
            <strong>⛔ Compte suspendu.</strong> Contactez le support pour réactiver votre
            restaurant.
          </div>
        )}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
