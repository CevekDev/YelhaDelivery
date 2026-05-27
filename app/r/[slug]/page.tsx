import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MenuItemButton } from './menu-item-button';
import { CartButton } from './cart-button';
import { formatPrice } from '@/lib/utils';
import type { MenuCategory, MenuItem, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('restaurants')
    .select('name, description')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Pick<Restaurant, 'name' | 'description'>>();
  if (!data) return { title: 'Restaurant introuvable' };
  return { title: data.name, description: data.description ?? undefined };
}

export default async function PublicRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant) notFound();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_visible', true)
      .order('sort_order')
      .returns<MenuCategory[]>(),
    supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order')
      .returns<MenuItem[]>(),
  ]);

  const byCategory = new Map<string | null, MenuItem[]>();
  (items ?? []).forEach((i) => {
    const k = i.category_id;
    if (!byCategory.has(k)) byCategory.set(k, []);
    byCategory.get(k)!.push(i);
  });

  const canOrder = restaurant.is_open && restaurant.accept_orders;

  return (
    <main className="min-h-screen pb-32">
      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">{restaurant.name}</h1>
            <Badge variant={canOrder ? 'success' : 'secondary'}>
              {canOrder ? 'Ouvert' : restaurant.is_open ? 'Commandes désactivées' : 'Fermé'}
            </Badge>
          </div>
          {restaurant.description && (
            <p className="mt-2 text-muted-foreground">{restaurant.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {restaurant.address && <span>📍 {restaurant.address}</span>}
            {restaurant.city && <span>{restaurant.city}</span>}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="hover:text-foreground">
                ☎ {restaurant.phone}
              </a>
            )}
            <span>🚚 {formatPrice(restaurant.delivery_fee)} de livraison</span>
            <span>⏱ ~{restaurant.estimated_delivery_time} min</span>
            {restaurant.min_order > 0 && <span>Min. {formatPrice(restaurant.min_order)}</span>}
          </div>
        </div>
      </header>

      {/* Menu */}
      <section className="container space-y-8 py-8">
        {(categories ?? []).length === 0 && !byCategory.has(null) && (
          <p className="py-10 text-center text-sm text-muted-foreground">Menu en cours de préparation.</p>
        )}

        {(categories ?? []).map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={cat.id}>
              <h2 className="mb-3 font-display text-xl font-bold">{cat.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    slug={slug}
                    canOrder={canOrder}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {byCategory.has(null) && (
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">Autres plats</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {byCategory.get(null)!.map((item) => (
                <ItemCard key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Bouton panier fixe */}
      <CartButton slug={slug} deliveryFee={restaurant.delivery_fee} canOrder={canOrder} />
    </main>
  );
}

function ItemCard({ item, slug, canOrder }: { item: MenuItem; slug: string; canOrder: boolean }) {
  const disabled = !item.is_available || !canOrder;
  return (
    <Card className={`flex overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
      {item.image_url ? (
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          <Image src={item.image_url} alt="" fill className="object-cover" sizes="128px" />
        </div>
      ) : (
        <div className="h-28 w-28 shrink-0 bg-input sm:h-32 sm:w-32" />
      )}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="font-medium leading-tight">{item.name}</p>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display font-bold">{formatPrice(item.price)}</span>
          <MenuItemButton
            slug={slug}
            item={{ menu_item_id: item.id, name: item.name, price: Number(item.price) }}
            disabled={disabled}
          />
        </div>
      </div>
    </Card>
  );
}
