import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { MenuItemButton } from './menu-item-button';
import { CartButton } from './cart-button';
import { CategoryNav } from './category-nav';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Sparkles, Star, Truck } from 'lucide-react';
import type { MenuCategory, MenuItem, OpeningHour, Restaurant } from '@/types/database';
import { HoursInfo, isOpenNow } from '@/components/hours-info';

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

  const [{ data: categories }, { data: items }, { data: hours }, { data: etaData }] =
    await Promise.all([
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
      supabase
        .from('opening_hours')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('day_of_week')
        .returns<OpeningHour[]>(),
      supabase.rpc('get_delivery_estimate', { p_restaurant_id: restaurant.id }),
    ]);
  const openNow = isOpenNow(hours ?? []);
  const estimatedDeliveryTime =
    typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time;

  // Sépare plats normaux et suppléments
  const allItems = items ?? [];
  const regularItems = allItems.filter((i) => !i.is_extra);
  const extras = allItems.filter((i) => i.is_extra);
  const promoItems = regularItems.filter((i) => i.promo_price != null && i.is_available);

  const byCategory = new Map<string | null, MenuItem[]>();
  regularItems.forEach((i) => {
    const k = i.category_id;
    if (!byCategory.has(k)) byCategory.set(k, []);
    byCategory.get(k)!.push(i);
  });

  const canOrder = restaurant.is_open && restaurant.accept_orders && openNow;
  const visibleCategories = (categories ?? []).filter(
    (c) => (byCategory.get(c.id)?.length ?? 0) > 0,
  );
  const hasUncategorized = (byCategory.get(null)?.length ?? 0) > 0;
  const hasExtras = extras.length > 0;
  const hasPromos = promoItems.length > 0;

  return (
    <main className="min-h-screen bg-background pb-32">
      {/* Top bar */}
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

      {/* Bannière promotionnelle (si configurée) */}
      {(restaurant.banner_text || restaurant.banner_image_url) && (
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="container flex items-center gap-4 py-3">
            {restaurant.banner_image_url && (
              <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded sm:block">
                <Image
                  src={restaurant.banner_image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <p className="truncate text-sm font-semibold">{restaurant.banner_text}</p>
            </div>
          </div>
        </div>
      )}

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
                    {canOrder
                      ? '● Ouvert'
                      : !restaurant.is_open
                        ? 'Fermé'
                        : !openNow
                          ? 'Fermé en ce moment'
                          : 'Commandes désactivées'}
                  </Badge>
                </div>
                {restaurant.description && (
                  <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                    {restaurant.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm md:grid-cols-4">
              <InfoChip
                icon={<Truck className="h-4 w-4" />}
                label="Livraison"
                value={
                  restaurant.delivery_fee === 0
                    ? 'Gratuite'
                    : formatPrice(restaurant.delivery_fee)
                }
              />
              <InfoChip
                icon={<Clock className="h-4 w-4" />}
                label="Temps"
                value={`~${estimatedDeliveryTime} min`}
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

            {/* Hints livraison gratuite / minimum */}
            {(restaurant.free_delivery_above || restaurant.min_order > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {restaurant.free_delivery_above && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 font-semibold text-success">
                    🎁 Livraison offerte dès {formatPrice(restaurant.free_delivery_above)}
                  </span>
                )}
                {restaurant.min_order > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    Min. {formatPrice(restaurant.min_order)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Horaires (collapsible card) */}
          {(hours?.length ?? 0) > 0 && (
            <details className="group mt-3 rounded-2xl border border-border bg-card shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Horaires d&apos;ouverture
                </span>
                <span className="text-xs text-muted-foreground group-open:hidden">Voir</span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">Masquer</span>
              </summary>
              <div className="border-t border-border px-5 py-3">
                <HoursInfo hours={hours ?? []} />
              </div>
            </details>
          )}

          {/* Closed-now warning */}
          {restaurant.is_open && restaurant.accept_orders && !openNow && (hours?.length ?? 0) > 0 && (
            <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              ⏰ Le restaurant est <strong>fermé en ce moment</strong> selon ses horaires. Vous
              pouvez consulter le menu mais pas commander.
            </div>
          )}
        </div>
      </section>

      {/* Sticky category nav */}
      {(visibleCategories.length > 0 || hasUncategorized || hasExtras || hasPromos) && (
        <CategoryNav
          categories={visibleCategories.map((c) => ({ id: c.id, name: c.name }))}
          hasUncategorized={hasUncategorized}
          hasExtras={hasExtras}
          hasPromos={hasPromos}
        />
      )}

      {/* === Section Promos en haut (si y'en a) === */}
      {hasPromos && (
        <section id="cat-promos" className="container mt-8 scroll-mt-32">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Offres du moment
            </h2>
            <span className="text-xs text-muted-foreground">
              {promoItems.length} en promo
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {promoItems.map((item) => (
              <ItemCard key={item.id} item={item} slug={slug} canOrder={canOrder} promo />
            ))}
          </div>
        </section>
      )}

      {/* Menu principal */}
      <section className="container mt-10 space-y-12">
        {visibleCategories.length === 0 && !hasUncategorized && !hasExtras && (
          <div className="rounded-2xl border border-dashed border-border bg-muted py-20 text-center">
            <p className="text-sm font-medium">Menu en cours de préparation</p>
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

        {/* === Section Suppléments / Sauces === */}
        {hasExtras && (
          <section id="cat-extras" className="scroll-mt-32">
            <div className="mb-5 flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
                  Suppléments
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sauces, accompagnements, boissons à ajouter à votre commande.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{extras.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((item) => (
                <ExtraCard key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </section>
        )}
      </section>

      <CartButton slug={slug} restaurant={restaurant} canOrder={canOrder} />
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
  promo,
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  featured?: boolean;
  promo?: boolean;
}) {
  const disabled = !item.is_available || !canOrder;
  const activePrice = item.promo_price ?? item.price;
  const discount =
    item.promo_price != null
      ? Math.round(((item.price - item.promo_price) / item.price) * 100)
      : 0;

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

        {/* Badges en surimpression */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
              -{discount}%
            </span>
          )}
          {featured && item.is_available && !promo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background shadow-sm">
              <Star className="h-3 w-3 fill-current" />
              Populaire
            </span>
          )}
        </div>

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
        <div className="mt-4 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            {item.promo_price != null && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(item.price)}
              </span>
            )}
            <span
              className={
                'font-display text-lg font-extrabold tabular-nums ' +
                (item.promo_price != null ? 'text-primary' : '')
              }
            >
              {formatPrice(activePrice)}
            </span>
          </div>
          <MenuItemButton
            slug={slug}
            item={{
              menu_item_id: item.id,
              name: item.name,
              price: Number(activePrice),
            }}
            disabled={disabled}
          />
        </div>
      </div>
    </article>
  );
}

function ExtraCard({
  item,
  slug,
  canOrder,
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
}) {
  const disabled = !item.is_available || !canOrder;
  const activePrice = item.promo_price ?? item.price;

  return (
    <div
      className={
        'flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ' +
        (disabled ? 'opacity-60' : '')
      }
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.image_url ? (
          <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
            🥫
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="text-xs font-bold text-primary">+{formatPrice(activePrice)}</p>
      </div>
      <MenuItemButton
        slug={slug}
        item={{
          menu_item_id: item.id,
          name: item.name,
          price: Number(activePrice),
        }}
        disabled={disabled}
      />
    </div>
  );
}
