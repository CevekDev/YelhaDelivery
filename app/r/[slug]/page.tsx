import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MenuItemButton } from './menu-item-button';
import { CartButton } from './cart-button';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Truck } from 'lucide-react';
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
    <main className="min-h-screen bg-background pb-32">
      {/* Top bar minimaliste */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-display text-base font-extrabold">
            Yelha<span className="text-primary">Dms</span>
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            Commander chez <strong className="text-foreground">{restaurant.name}</strong>
          </span>
        </div>
      </header>

      {/* Hero restaurant — style Deliveroo */}
      <section className="relative">
        {/* Image de couverture (placeholder pattern si pas d'image) */}
        <div className="relative h-48 w-full bg-food-pattern md:h-64">
          {restaurant.cover_url ? (
            <Image
              src={restaurant.cover_url}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          )}
        </div>

        <div className="container -mt-12 md:-mt-16">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-extrabold md:text-3xl">
                    {restaurant.name}
                  </h1>
                  <Badge variant={canOrder ? 'success' : 'secondary'}>
                    {canOrder ? 'Ouvert' : restaurant.is_open ? 'Commandes désactivées' : 'Fermé'}
                  </Badge>
                </div>
                {restaurant.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{restaurant.description}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              {restaurant.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {restaurant.address}{restaurant.city && `, ${restaurant.city}`}
                </span>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  {restaurant.phone}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" />
                {formatPrice(restaurant.delivery_fee)} de livraison
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                ~{restaurant.estimated_delivery_time} min
              </span>
              {restaurant.min_order > 0 && (
                <span>
                  Min. <strong className="text-foreground">{formatPrice(restaurant.min_order)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section className="container mt-10 space-y-10">
        {(categories ?? []).length === 0 && !byCategory.has(null) && (
          <p className="rounded-xl border border-dashed border-border bg-muted py-16 text-center text-sm text-muted-foreground">
            Menu en cours de préparation.
          </p>
        )}

        {(categories ?? []).map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={cat.id}>
              <h2 className="mb-4 font-display text-xl font-extrabold md:text-2xl">{cat.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="mb-4 font-display text-xl font-extrabold md:text-2xl">Autres plats</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {byCategory.get(null)!.map((item) => (
                <ItemCard key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sticky cart button bas mobile + desktop */}
      <CartButton slug={slug} deliveryFee={restaurant.delivery_fee} canOrder={canOrder} />
    </main>
  );
}

function ItemCard({ item, slug, canOrder }: { item: MenuItem; slug: string; canOrder: boolean }) {
  const disabled = !item.is_available || !canOrder;
  return (
    <article
      className={
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover ' +
        (disabled ? 'opacity-60' : '')
      }
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-food-pattern text-4xl">
            🍽️
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
              Indisponible
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <h3 className="font-semibold leading-tight">{item.name}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-base font-bold">{formatPrice(item.price)}</span>
          <MenuItemButton
            slug={slug}
            item={{ menu_item_id: item.id, name: item.name, price: Number(item.price) }}
            disabled={disabled}
          />
        </div>
      </div>
    </article>
  );
}
