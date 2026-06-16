import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CartButton } from '../cart-button';
import { CategoryNav } from '../category-nav';
import { ItemRow } from '../item-row';
import { PublicPageHeader } from '../page-header';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Sparkles, Star, Truck } from 'lucide-react';
import type {
  MenuCategory,
  MenuItem,
  MenuItemExtra,
  MenuItemVariant,
  OpeningHour,
  Restaurant,
} from '@/types/database';
import { HoursInfo, isOpenNow } from '@/components/hours-info';
import { restaurantMetadata, restaurantJsonLd } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('restaurants')
    .select('name, description, city, address, phone, cover_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Pick<Restaurant, 'name' | 'description' | 'city' | 'address' | 'phone' | 'cover_url'>>();
  if (!data) return { title: 'Restaurant introuvable' };
  return restaurantMetadata({ ...data, slug, coverUrl: data.cover_url }, 'menu');
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant) notFound();

  const [
    { data: categories },
    { data: items },
    { data: hours },
    { data: etaData },
    { data: extrasLinks },
    { data: variantRows },
    { data: ratingData },
  ] = await Promise.all([
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
    supabase
      .from('menu_item_extras')
      .select('menu_item_id, extra_item_id, is_free')
      .returns<Pick<MenuItemExtra, 'menu_item_id' | 'extra_item_id' | 'is_free'>[]>(),
    supabase
      .from('menu_item_variants')
      .select('*')
      .eq('is_available', true)
      .order('sort_order')
      .returns<MenuItemVariant[]>(),
    supabase.rpc('get_restaurant_rating', { p_restaurant_id: restaurant.id }),
  ]);

  const openNow = isOpenNow(hours ?? []);
  const estimatedDeliveryTime =
    typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time;

  type RatingRow = { avg_rating: number | null; review_count: number };
  const rating = ((ratingData ?? []) as unknown as RatingRow[])[0];
  const reviewCount = rating?.review_count ?? 0;
  const avgRating = rating?.avg_rating != null ? Number(rating.avg_rating) : null;

  const allItems = items ?? [];
  const regularItems = allItems.filter(
    (i) => !i.is_extra && i.item_type !== 'sauce' && i.item_type !== 'supplement',
  );
  const extrasById = new Map<string, MenuItem>(
    allItems
      .filter((i) => i.is_extra || i.item_type === 'sauce' || i.item_type === 'supplement')
      .map((e) => [e.id, e]),
  );
  const promoItems = regularItems.filter(
    (i) => (i.promo_price != null || i.item_type === 'offer') && i.is_available,
  );

  const itemExtrasMap = new Map<string, MenuItem[]>();
  const freeExtraIdsMap = new Map<string, string[]>();

  for (const link of extrasLinks ?? []) {
    const extra = extrasById.get(link.extra_item_id);
    if (!extra) continue;
    if (!itemExtrasMap.has(link.menu_item_id)) itemExtrasMap.set(link.menu_item_id, []);
    itemExtrasMap.get(link.menu_item_id)!.push(extra);
    if (link.is_free) {
      if (!freeExtraIdsMap.has(link.menu_item_id)) freeExtraIdsMap.set(link.menu_item_id, []);
      freeExtraIdsMap.get(link.menu_item_id)!.push(link.extra_item_id);
    }
  }

  const itemVariantsMap = new Map<string, MenuItemVariant[]>();
  for (const v of variantRows ?? []) {
    if (!itemVariantsMap.has(v.menu_item_id)) itemVariantsMap.set(v.menu_item_id, []);
    itemVariantsMap.get(v.menu_item_id)!.push(v);
  }

  const byCategory = new Map<string | null, MenuItem[]>();
  regularItems.forEach((i) => {
    const k = i.category_id;
    if (!byCategory.has(k)) byCategory.set(k, []);
    byCategory.get(k)!.push(i);
  });

  const canOrder = restaurant.is_open && restaurant.accept_orders;
  const visibleCategories = (categories ?? []).filter(
    (c) => (byCategory.get(c.id)?.length ?? 0) > 0,
  );
  const hasUncategorized = (byCategory.get(null)?.length ?? 0) > 0;
  const hasExtras = extrasById.size > 0;
  const hasPromos = promoItems.length > 0;

  const statusLabel = !restaurant.is_open
    ? 'Fermé'
    : !restaurant.accept_orders
      ? 'Commandes désactivées'
      : !openNow && (hours ?? []).length > 0
        ? 'Ouvert · Hors horaires habituels'
        : 'Ouvert';

  // Lien retour : page d'accueil du site si activée, sinon accueil YelhaDelivery
  const homeHref = restaurant.home_enabled ? `/r/${slug}` : '/';

  const jsonLd = restaurantJsonLd({
    name: restaurant.name,
    description: restaurant.description,
    slug,
    city: restaurant.city,
    address: restaurant.address,
    phone: restaurant.phone,
    coverUrl: restaurant.cover_url,
  });

  return (
    <main className="min-h-screen bg-[#F5F5F5] pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicPageHeader slug={slug} restaurantName={restaurant.name} homeHref={homeHref} />

      <div className="relative h-[260px] w-full overflow-hidden bg-gray-300 md:h-[340px]">
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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <div className="flex items-end gap-3">
            {restaurant.logo_url && (
              <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-2xl border-2 border-white/30 bg-white shadow-lg">
                <Image src={restaurant.logo_url} alt="" fill className="object-cover" sizes="60px" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-extrabold leading-tight text-white drop-shadow md:text-2xl">
                {restaurant.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white ' +
                    (canOrder ? 'bg-green-500' : 'bg-red-500')
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  {statusLabel}
                </span>
                {avgRating !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {avgRating.toFixed(1)}
                    <span className="font-normal text-white/70">({reviewCount})</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <InfoPill icon={<Truck className="h-3.5 w-3.5" />}>
            {restaurant.delivery_fee === 0 ? 'Livraison gratuite' : formatPrice(restaurant.delivery_fee)}
          </InfoPill>
          <InfoPill icon={<Clock className="h-3.5 w-3.5" />}>~{estimatedDeliveryTime} min</InfoPill>
          {avgRating !== null && (
            <InfoPill icon={<Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}>
              {avgRating.toFixed(1)} ({reviewCount} avis)
            </InfoPill>
          )}
          {(restaurant.city || restaurant.address) && (
            <InfoPill icon={<MapPin className="h-3.5 w-3.5" />}>
              {restaurant.city || restaurant.address}
            </InfoPill>
          )}
          {restaurant.free_delivery_above && (
            <InfoPill icon={<Sparkles className="h-3.5 w-3.5" />}>
              Offerte dès {formatPrice(restaurant.free_delivery_above)}
            </InfoPill>
          )}
          {restaurant.min_order > 0 && <InfoPill>Min. {formatPrice(restaurant.min_order)}</InfoPill>}
        </div>

        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="mt-3 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
          >
            <Phone className="h-3.5 w-3.5" />
            {restaurant.phone}
          </a>
        )}

        {(hours?.length ?? 0) > 0 && (
          <details className="group mt-3 border-t border-gray-100 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-gray-500">
              <span>Horaires d&apos;ouverture</span>
              <span className="text-gray-400 transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-2">
              <HoursInfo hours={hours ?? []} compact />
            </div>
          </details>
        )}
      </div>

      {(restaurant.banner_text || restaurant.banner_image_url) && (
        <div className="border-y border-primary/10 bg-primary/5">
          <div className="flex items-center gap-2 px-4 py-2.5">
            {restaurant.banner_image_url && (
              <div className="relative h-8 w-12 shrink-0 overflow-hidden rounded-lg">
                <Image src={restaurant.banner_image_url} alt="" fill className="object-cover" sizes="48px" />
              </div>
            )}
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold text-primary">{restaurant.banner_text}</p>
          </div>
        </div>
      )}

      {(visibleCategories.length > 0 || hasUncategorized || hasExtras || hasPromos) && (
        <CategoryNav
          categories={visibleCategories.map((c) => ({ id: c.id, name: c.name }))}
          hasUncategorized={hasUncategorized}
          hasExtras={hasExtras}
          hasPromos={hasPromos}
        />
      )}

      <div className="py-3">
        {visibleCategories.length === 0 && !hasUncategorized && !hasExtras && (
          <div className="mx-4 rounded-2xl bg-white py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-400">Menu en cours de préparation</p>
          </div>
        )}

        {hasPromos && (
          <section id="cat-promos" className="mb-4 scroll-mt-32">
            <SectionHeader
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              title="Offres du moment"
              count={promoItems.length}
            />
            <div className="space-y-3">
              {promoItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={itemExtrasMap.get(item.id) ?? []}
                  availableVariants={itemVariantsMap.get(item.id) ?? []}
                  freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                />
              ))}
            </div>
          </section>
        )}

        {visibleCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-4 scroll-mt-32">
              <SectionHeader title={cat.name} count={list.length} />
              <div className="space-y-3">
                {list.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    slug={slug}
                    canOrder={canOrder}
                    availableExtras={itemExtrasMap.get(item.id) ?? []}
                    availableVariants={itemVariantsMap.get(item.id) ?? []}
                    freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {hasUncategorized && (
          <section id="cat-other" className="mb-4 scroll-mt-32">
            <SectionHeader title="Autres plats" count={byCategory.get(null)!.length} />
            <div className="space-y-3">
              {byCategory.get(null)!.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={itemExtrasMap.get(item.id) ?? []}
                  availableVariants={itemVariantsMap.get(item.id) ?? []}
                  freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                />
              ))}
            </div>
          </section>
        )}

        {hasExtras && (
          <section id="cat-extras" className="mb-4 scroll-mt-32">
            <SectionHeader
              title="Suppléments & Sauces"
              subtitle="Accompagnements, sauces, boissons"
              count={extrasById.size}
            />
            <div className="space-y-3">
              {[...extrasById.values()].map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={[]}
                  availableVariants={[]}
                  freeExtraIds={[]}
                  extra
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <CartButton slug={slug} restaurant={restaurant} canOrder={canOrder} />
    </main>
  );
}

function InfoPill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1.5 text-xs font-semibold text-gray-700">
      {icon}
      {children}
    </span>
  );
}

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
    <div className="mb-2 flex items-center justify-between px-4 pt-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-base font-extrabold text-[#1A1A1A]">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {count != null && (
        <span className="text-xs text-gray-400">
          {count} article{count > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
