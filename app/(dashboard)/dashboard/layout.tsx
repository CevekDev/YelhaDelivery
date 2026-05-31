import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BottomNav, Sidebar } from '@/components/dashboard/sidebar';
import { OpenToggle } from '@/components/dashboard/open-toggle';
import { ExternalLink } from 'lucide-react';
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
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar restaurantName={restaurantName} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">
                {restaurantName}
              </p>
              {restaurant && (
                <p className="text-xs text-muted-foreground">
                  {restaurant.is_open ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      Vous recevez des commandes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Fermé — pas de commandes acceptées
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          {restaurant && (
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              >
                Voir ma page
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {restaurant.is_open ? 'Ouvert' : 'Fermé'}
                </span>
                <OpenToggle isOpen={restaurant.is_open} />
              </div>
            </div>
          )}
        </header>

        {restaurant?.status === 'suspended' && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-6">
            <strong>⛔ Compte suspendu.</strong> Contactez le support pour réactiver votre restaurant.
          </div>
        )}
        {restaurant && !restaurant.accept_orders && restaurant.is_open && (
          <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning md:px-6">
            ⚠ Les commandes sont temporairement désactivées dans vos paramètres.
          </div>
        )}

        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
