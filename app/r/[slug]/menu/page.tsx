import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CartButton } from '../cart-button';
import { CategoryNav } from '../category-nav';
import { ItemRow } from '../item-row';
import { MenuSearch } from '../menu-search';
import { formatPrice } from '@/lib/utils';
import { Clock, MapPin, Phone, Sparkles, Star, Truck } from 'lucide-react';
import type { MenuItem, MenuItemVariant } from '@/types/database';
import { HoursInfo, isOpenNow } from '@/components/hours-info';
import {
  restaurantMetadata,
  restaurantJsonLd,
  menuJsonLd,
  breadcrumbJsonLd,
  serializeJsonLd,
  APP_URL,
} from '@/lib/seo';
import { getTemplate, templateSeoDefaults } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import { getMenuData } from '@/lib/public-data';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { restaurant } = await getMenuData(slug);
  if (!restaurant) return { title: 'Restaurant introuvable' };
  return restaurantMetadata(
    { ...restaurant, slug, coverUrl: restaurant.cover_url, logoUrl: restaurant.logo_url },
    'menu',
  );
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const {
    restaurant,
    categories,
    items,
    hours,
    extrasLinks,
    variants: variantRows,
    avgRating,
    reviewCount,
    estimatedDeliveryTime: rawEta,
  } = await getMenuData(slug);

  if (!restaurant) notFound();

  const openNow = isOpenNow(hours);
  const estimatedDeliveryTime = rawEta ?? restaurant.estimated_delivery_time;

  const allItems = items;
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
  const favoriteItems = regularItems.filter((i) => i.is_favorite && i.is_available);

  // Suggestions cross-sell : après le clic sur un plat principal, la modale
  // propose des boissons puis des desserts issus des catégories dédiées.
  const drinkCategoryIds = new Set(
    (categories ?? [])
      .filter((c) => /boisson|drink|beverage/i.test(c.name))
      .map((c) => c.id),
  );
  const dessertCategoryIds = new Set(
    (categories ?? [])
      .filter((c) => /dessert|douceur|sucre/i.test(c.name))
      .map((c) => c.id),
  );
  const suggestedDrinks = regularItems.filter(
    (i) => i.category_id != null && drinkCategoryIds.has(i.category_id) && i.is_available,
  );
  const suggestedDesserts = regularItems.filter(
    (i) => i.category_id != null && dessertCategoryIds.has(i.category_id) && i.is_available,
  );
  function suggestionsFor(item: MenuItem) {
    const isDrink = item.category_id != null && drinkCategoryIds.has(item.category_id);
    const isDessert = item.category_id != null && dessertCategoryIds.has(item.category_id);
    if (isDrink || isDessert || item.is_extra) return { drinks: [], desserts: [] };
    return { drinks: suggestedDrinks, desserts: suggestedDesserts };
  }

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
  const hasFavorites = favoriteItems.length > 0;

  const statusLabel = !restaurant.is_open
    ? 'Fermé'
    : !restaurant.accept_orders
      ? 'Livraison en pause'
      : !openNow && (hours ?? []).length > 0
        ? 'Ouvert · Hors horaires habituels'
        : 'Ouvert';

  const template = getTemplate(restaurant.template_id);

  const seoDefaults = templateSeoDefaults(restaurant.template_id);
  const jsonLd = restaurantJsonLd(
    {
      name: restaurant.name,
      description: restaurant.description,
      slug,
      city: restaurant.city,
      address: restaurant.address,
      phone: restaurant.phone,
      coverUrl: restaurant.cover_url,
      cuisineType: restaurant.cuisine_type || seoDefaults.cuisine,
      priceRange: restaurant.price_range || seoDefaults.priceRange,
    },
    { openingHours: hours ?? [], ratingValue: avgRating, reviewCount },
  );

  // Menu structuré (schema.org Menu → MenuSection → MenuItem) : plats + prix par catégorie.
  const menuLd = menuJsonLd(
    { name: restaurant.name, slug },
    (categories ?? [])
      .map((c) => ({
        name: c.name,
        items: regularItems
          .filter((i) => i.category_id === c.id && i.is_available)
          .map((i) => ({
            name: i.name,
            description: i.description,
            price: Number(i.promo_price ?? i.price),
          })),
      }))
      .filter((s) => s.items.length > 0),
  );

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Accueil', url: `${APP_URL}/r/${slug}` },
    { name: 'Menu', url: `${APP_URL}/r/${slug}/menu` },
  ]);

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(menuLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <main className="pb-32">

      <div className="relative h-[260px] w-full overflow-hidden bg-[var(--site-surface)] md:h-[340px]">
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
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--site-accent)]/60 via-[var(--site-accent)]/30 to-[var(--site-accent)]/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 pb-5">
          <div className="mx-auto flex max-w-5xl items-end gap-3 px-4">
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

      <div className="border-b border-[var(--site-border)] bg-[var(--site-surface)]">
        <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <InfoPill icon={<Truck className="h-3.5 w-3.5" />}>
            {Number(restaurant.delivery_fee) === 0
              ? 'Livraison gratuite'
              : formatPrice(restaurant.delivery_fee)}
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
            className="mt-3 flex items-center gap-1.5 text-sm text-[color:var(--site-muted)] hover:text-[color:var(--site-text)]"
          >
            <Phone className="h-3.5 w-3.5" />
            {restaurant.phone}
          </a>
        )}

        {(hours?.length ?? 0) > 0 && (
          <details className="group mt-3 border-t border-[var(--site-border)] pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[color:var(--site-muted)]">
              <span>Horaires d&apos;ouverture</span>
              <span className="text-[color:var(--site-muted)] transition-transform duration-200 group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-2">
              <HoursInfo hours={hours ?? []} compact />
            </div>
          </details>
        )}
        </div>
      </div>

      {(restaurant.banner_text || restaurant.banner_image_url) && (
        <div className="border-y border-[var(--site-accent)]/20 bg-[var(--site-accent)]/10">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
            {restaurant.banner_image_url && (
              <div className="relative h-8 w-12 shrink-0 overflow-hidden rounded-lg">
                <Image src={restaurant.banner_image_url} alt="" fill className="object-cover" sizes="48px" />
              </div>
            )}
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[color:var(--site-accent)]" />
            <p className="truncate text-sm font-semibold text-[color:var(--site-accent)]">{restaurant.banner_text}</p>
          </div>
        </div>
      )}

      <MenuSearch placeholder={`Rechercher chez ${restaurant.name}…`} />

      {(visibleCategories.length > 0 || hasUncategorized || hasExtras || hasPromos || hasFavorites) && (
        <CategoryNav
          categories={visibleCategories.map((c) => ({ id: c.id, name: c.name }))}
          hasUncategorized={hasUncategorized}
          hasExtras={hasExtras}
          hasPromos={hasPromos}
          hasFavorites={hasFavorites}
        />
      )}

      <div className="py-3">
        {visibleCategories.length === 0 && !hasUncategorized && !hasExtras && !hasFavorites && (
          <div className="mx-4 rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] py-16 text-center">
            <p className="text-sm font-medium text-[color:var(--site-muted)]">Menu en cours de préparation</p>
          </div>
        )}

        {hasFavorites && (
          <section id="cat-favorites" data-menu-section className="mb-4 scroll-mt-32">
            <SectionHeader
              icon={<Star className="h-4 w-4 fill-[var(--site-accent)] text-[color:var(--site-accent)]" />}
              title="Favoris"
              subtitle="Les plats préférés de nos clients"
              count={favoriteItems.length}
            />
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 md:px-4">
              {favoriteItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={itemExtrasMap.get(item.id) ?? []}
                  availableVariants={itemVariantsMap.get(item.id) ?? []}
                  freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                  suggestedDrinks={suggestionsFor(item).drinks}
                  suggestedDesserts={suggestionsFor(item).desserts}
                />
              ))}
            </div>
          </section>
        )}

        {hasPromos && (
          <section id="cat-promos" data-menu-section className="mb-4 scroll-mt-32">
            <SectionHeader
              icon={<Sparkles className="h-4 w-4 text-[color:var(--site-accent)]" />}
              title="Offres du moment"
              count={promoItems.length}
            />
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 md:px-4">
              {promoItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={itemExtrasMap.get(item.id) ?? []}
                  availableVariants={itemVariantsMap.get(item.id) ?? []}
                  freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                  suggestedDrinks={suggestionsFor(item).drinks}
                  suggestedDesserts={suggestionsFor(item).desserts}
                />
              ))}
            </div>
          </section>
        )}

        {visibleCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} data-menu-section className="mb-4 scroll-mt-32">
              <SectionHeader title={cat.name} count={list.length} />
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 md:px-4">
                {list.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    slug={slug}
                    canOrder={canOrder}
                    availableExtras={itemExtrasMap.get(item.id) ?? []}
                    availableVariants={itemVariantsMap.get(item.id) ?? []}
                    freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                    suggestedDrinks={suggestionsFor(item).drinks}
                    suggestedDesserts={suggestionsFor(item).desserts}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {hasUncategorized && (
          <section id="cat-other" data-menu-section className="mb-4 scroll-mt-32">
            <SectionHeader title="Autres plats" count={byCategory.get(null)!.length} />
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 md:px-4">
              {byCategory.get(null)!.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  slug={slug}
                  canOrder={canOrder}
                  availableExtras={itemExtrasMap.get(item.id) ?? []}
                  availableVariants={itemVariantsMap.get(item.id) ?? []}
                  freeExtraIds={freeExtraIdsMap.get(item.id) ?? []}
                  suggestedDrinks={suggestionsFor(item).drinks}
                  suggestedDesserts={suggestionsFor(item).desserts}
                />
              ))}
            </div>
          </section>
        )}

        {hasExtras && (
          <section id="cat-extras" data-menu-section className="mb-4 scroll-mt-32">
            <SectionHeader
              title="Suppléments & Sauces"
              subtitle="Accompagnements, sauces, boissons"
              count={extrasById.size}
            />
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-0 md:grid-cols-2 md:gap-3 md:px-4">
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
    </SiteShell>
  );
}

function InfoPill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--site-border)] bg-[var(--site-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--site-text)]">
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
    <div className="mx-auto mb-3 flex max-w-5xl items-center justify-between px-4 pt-4 md:pt-6">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-[family-name:var(--font-site-heading)] text-lg font-extrabold text-[color:var(--site-text)] md:text-xl">{title}</h2>
        {subtitle && <p className="hidden text-xs text-[color:var(--site-muted)] sm:block">{subtitle}</p>}
      </div>
      {count != null && (
        <span className="text-xs text-[color:var(--site-muted)]">
          {count} article{count > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
