import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MenuItemButton } from './menu-item-button';
import { CartButton } from './cart-button';
import { CategoryNav } from './category-nav';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Star, Truck } from 'lucide-react';
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
  const visibleCategories = (categories ?? []).filter(
    (c) => (byCategory.get(c.id)?.length ?? 0) > 0,
  );
  const hasUncategorized = (byCategory.get(null)?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-display text-base font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
          <span className="hidden truncate text-sm text-muted-foreground sm:block">
            Commander chez <strong className="text-foreground">{restaurant.name}</strong>
          </span>
        </div>
      </header>

      {/* Hero restaurant */}
      <section className="relative">
        <div className="relative h-56 w-full overflow-hidden bg-food-pattern md:h-72">
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
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        </div>

        <div className="container -mt-20 md:-mt-24">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                    {restaurant.name}
                  </h1>
                  <Badge variant={canOrder ? 'success' : 'secondary'}>
                    {canOrder ? '● Ouvert' : restaurant.is_open ? 'Commandes désactivées' : 'Fermé'}
                  </Badge>
                </div>
                {restaurant.description && (
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">{restaurant.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-semibold">Nouveau</span>
                <span className="text-muted-foreground">sur YelhaDelivery</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm md:grid-cols-4">
              <InfoChip
                icon={<Truck className="h-4 w-4" />}
                label="Livraison"
                value={restaurant.delivery_fee === 0 ? 'Gratuite' : formatPrice(restaurant.delivery_fee)}
              />
              <InfoChip
                icon={<Clock className="h-4 w-4" />}
                label="Temps"
                value={`~${restaurant.estimated_delivery_time} min`}
              />
              <InfoChip
                icon={<MapPin className="h-4 w-4" />}
                label="Adresse"
                value={restaurant.city || restaurant.address || '—'}
              />
              {restaurant.phone ? (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-primary"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Appeler</p>
                    <p className="truncate text-sm font-semibold">{restaurant.phone}</p>
                  </div>
                </a>
              ) : (
                <InfoChip icon={<Phone className="h-4 w-4" />} label="Téléphone" value="—" />
              )}
            </div>

            {restaurant.min_order > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Commande minimum :{' '}
                <strong className="text-foreground">{formatPrice(restaurant.min_order)}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      {(visibleCategories.length > 0 || hasUncategorized) && (
        <CategoryNav
          categories={visibleCategories.map((c) => ({ id: c.id, name: c.name }))}
          hasUncategorized={hasUncategorized}
        />
      )}

      <section className="container mt-6 space-y-12">
        {visibleCategories.length === 0 && !hasUncategorized && (
          <div className="rounded-2xl border border-dashed border-border bg-muted py-20 text-center">
            <p className="text-sm font-medium">Menu en cours de préparation</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Revenez bientôt — le restaurant prépare ses plats.
            </p>
          </div>
        )}

        {visibleCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                  {cat.name}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {list.length} plat{list.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    slug={slug}
                    canOrder={canOrder}
                    featured={idx === 0 && cat.sort_order === 1}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {hasUncategorized && (
          <section id="cat-other" className="scroll-mt-32">
            <h2 className="mb-5 font-display text-2xl font-extrabold md:text-3xl">Autres plats</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {byCategory.get(null)!.map((item) => (
                <ItemCard key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </section>
        )}
      </section>

      <CartButton slug={slug} deliveryFee={restaurant.delivery_fee} canOrder={canOrder} />
    </main>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  slug,
  canOrder,
  featured,
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  featured?: boolean;
}) {
  const disabled = !item.is_available || !canOrder;
  return (
    <article
      className={
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover ' +
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
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-food-pattern text-5xl opacity-50">
            🍽️
          </div>
        )}
        {featured && item.is_available && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background">
            <Star className="h-3 w-3 fill-current" />
            Populaire
          </span>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <span className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-card">
              Indisponible aujourd&apos;hui
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <h3 className="font-semibold leading-tight">{item.name}</h3>
          {item.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-lg font-extrabold tabular-nums">
            {formatPrice(item.price)}
          </span>
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
