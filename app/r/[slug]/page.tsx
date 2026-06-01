import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MenuItemButton } from './menu-item-button';
import { CartButton } from './cart-button';
import { CategoryNav } from './category-nav';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Sparkles, Truck, ChevronRight } from 'lucide-react';
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
    <main className="min-h-screen bg-[#f6f6f6] pb-32">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="font-display text-base font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
          <span className="hidden truncate text-sm text-gray-500 sm:block">
            <strong className="text-gray-900">{restaurant.name}</strong>
          </span>
        </div>
      </header>

      {/* Promotional banner */}
      {(restaurant.banner_text || restaurant.banner_image_url) && (
        <div className="bg-primary/5 border-b border-primary/10">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-6">
            {restaurant.banner_image_url && (
              <div className="relative hidden h-10 w-16 shrink-0 overflow-hidden rounded sm:block">
                <Image src={restaurant.banner_image_url} alt="" fill className="object-cover" sizes="64px" />
              </div>
            )}
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold text-primary">{restaurant.banner_text}</p>
          </div>
        </div>
      )}

      {/* Hero cover */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-200 md:h-64">
        {restaurant.cover_url ? (
          <Image
            src={restaurant.cover_url}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-primary/5" />
        )}
      </div>

      {/* Restaurant info card — UberEats style */}
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="rounded-b-2xl bg-white px-5 py-5 shadow-sm md:px-8 md:py-6">
          {/* Name + status */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="mt-1.5 max-w-prose text-sm text-gray-500">{restaurant.description}</p>
              )}
            </div>
            <span
              className={
                'mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ' +
                (canOrder
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-500')
              }
            >
              <span
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (canOrder ? 'bg-green-500' : 'bg-gray-400')
                }
              />
              {canOrder
                ? 'Ouvert'
                : !restaurant.is_open
                  ? 'Fermé'
                  : !openNow
                    ? 'Fermé en ce moment'
                    : 'Commandes désactivées'}
            </span>
          </div>

          {/* Delivery info pills */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                {restaurant.delivery_fee === 0 ? 'Livraison gratuite' : formatPrice(restaurant.delivery_fee)}
              </span>
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold">~{estimatedDeliveryTime} min</span>
            </div>
            {(restaurant.city || restaurant.address) && (
              <>
                <span className="text-gray-300">·</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{restaurant.city || restaurant.address}</span>
                </div>
              </>
            )}
            {restaurant.phone && (
              <>
                <span className="text-gray-300">·</span>
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  <span className="font-semibold">{restaurant.phone}</span>
                </a>
              </>
            )}
          </div>

          {/* Free delivery / min order hints */}
          {(restaurant.free_delivery_above || restaurant.min_order > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {restaurant.free_delivery_above && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  🎁 Livraison offerte dès {formatPrice(restaurant.free_delivery_above)}
                </span>
              )}
              {restaurant.min_order > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Commande min. {formatPrice(restaurant.min_order)}
                </span>
              )}
            </div>
          )}

          {/* Opening hours */}
          {(hours?.length ?? 0) > 0 && (
            <details className="group mt-4 border-t border-gray-100 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                  <Clock className="h-4 w-4" />
                  Horaires d&apos;ouverture
                </span>
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3">
                <HoursInfo hours={hours ?? []} />
              </div>
            </details>
          )}
        </div>

        {/* Closed warning */}
        {restaurant.is_open && restaurant.accept_orders && !openNow && (hours?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            ⏰ Le restaurant est <strong>fermé en ce moment</strong> selon ses horaires. Vous
            pouvez consulter le menu mais pas commander.
          </div>
        )}
      </div>

      {/* Sticky category nav */}
      {(visibleCategories.length > 0 || hasUncategorized || hasExtras || hasPromos) && (
        <CategoryNav
          categories={visibleCategories.map((c) => ({ id: c.id, name: c.name }))}
          hasUncategorized={hasUncategorized}
          hasExtras={hasExtras}
          hasPromos={hasPromos}
        />
      )}

      {/* Menu content */}
      <div className="mx-auto max-w-5xl space-y-2 px-4 py-4 md:px-6">

        {/* Promo section */}
        {hasPromos && (
          <section id="cat-promos" className="scroll-mt-32">
            <SectionHeader
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              title="Offres du moment"
              count={promoItems.length}
            />
            <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
              {promoItems.map((item) => (
                <UberEatsItemRow key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {visibleCategories.length === 0 && !hasUncategorized && !hasExtras && (
          <div className="rounded-2xl bg-white py-20 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-400">Menu en cours de préparation</p>
          </div>
        )}

        {/* Categories */}
        {visibleCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
              <SectionHeader title={cat.name} count={list.length} />
              <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
                {list.map((item) => (
                  <UberEatsItemRow key={item.id} item={item} slug={slug} canOrder={canOrder} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Uncategorized */}
        {hasUncategorized && (
          <section id="cat-other" className="scroll-mt-32">
            <SectionHeader title="Autres plats" count={byCategory.get(null)!.length} />
            <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
              {byCategory.get(null)!.map((item) => (
                <UberEatsItemRow key={item.id} item={item} slug={slug} canOrder={canOrder} />
              ))}
            </div>
          </section>
        )}

        {/* Extras */}
        {hasExtras && (
          <section id="cat-extras" className="scroll-mt-32">
            <SectionHeader
              title="Suppléments"
              subtitle="Sauces, accompagnements, boissons"
              count={extras.length}
            />
            <div className="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm">
              {extras.map((item) => (
                <UberEatsItemRow key={item.id} item={item} slug={slug} canOrder={canOrder} extra />
              ))}
            </div>
          </section>
        )}
      </div>

      <CartButton slug={slug} restaurant={restaurant} canOrder={canOrder} />
    </main>
  );
}

/* ─── Section header ─── */
function SectionHeader({
  icon,
  title,
  subtitle,
  count,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between first:mt-0">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-gray-900">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {count != null && (
        <span className="text-xs text-gray-400">
          {count} article{count > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

/* ─── UberEats-style horizontal item row ─── */
function UberEatsItemRow({
  item,
  slug,
  canOrder,
  extra,
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  extra?: boolean;
}) {
  const disabled = !item.is_available || !canOrder;
  const activePrice = item.promo_price ?? item.price;
  const discount =
    item.promo_price != null
      ? Math.round(((item.price - item.promo_price) / item.price) * 100)
      : 0;

  return (
    <div
      className={
        'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ' +
        (disabled ? 'opacity-50' : '')
      }
    >
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 leading-snug">{item.name}</p>
          {discount > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              -{discount}%
            </span>
          )}
          {!item.is_available && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
              Indisponible
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-500">{item.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-base font-extrabold text-gray-900 tabular-nums">
            {extra ? '+' : ''}{formatPrice(activePrice)}
          </span>
          {item.promo_price != null && (
            <span className="text-sm text-gray-400 line-through tabular-nums">
              {formatPrice(item.price)}
            </span>
          )}
        </div>
      </div>

      {/* Image + button */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100 md:h-24 md:w-24">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">
              🍽️
            </div>
          )}
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
  );
}
