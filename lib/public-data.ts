import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type {
  MenuCategory,
  MenuItem,
  MenuItemExtra,
  MenuItemVariant,
  OpeningHour,
  Restaurant,
} from '@/types/database';

// =====================================================================
// Couche de lecture publique CACHÉE pour les pages restaurant (accueil + menu).
//
// Ces pages étaient en `force-dynamic` → chaque visite relançait jusqu'à 7
// requêtes DB. On passe par `unstable_cache` (data cache Next) avec un client
// anonyme SANS cookies : le résultat est mémorisé par slug et partagé entre
// visiteurs. Invalidation immédiate via `revalidatePublicRestaurant(slug)` dans
// les Server Actions qui modifient un restaurant, + filet de sécurité temporel.
// =====================================================================

/** Fenêtre de fraîcheur maximale (secondes) même sans invalidation explicite. */
const PUBLIC_REVALIDATE_SECONDS = 120;

const restoTag = (slug: string) => `resto:${slug}`;

/**
 * Invalide le cache public (accueil + menu) d'un restaurant après une mutation.
 * À appeler dans les Server Actions du dashboard/admin qui touchent au resto.
 */
export function revalidatePublicRestaurant(slug: string) {
  revalidateTag(restoTag(slug));
}

/**
 * Client anonyme sans cookies : lecture publique protégée par la RLS.
 * Contrairement au client SSR, il ne lit pas `cookies()` → il est utilisable
 * dans une fonction `unstable_cache` (aucune dépendance à la requête).
 */
function publicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type RatingRow = { avg_rating: number | null; review_count: number };

function parseRating(ratingData: unknown): { avgRating: number | null; reviewCount: number } {
  const rating = ((ratingData ?? []) as unknown as RatingRow[])[0];
  return {
    avgRating: rating?.avg_rating != null ? Number(rating.avg_rating) : null,
    reviewCount: rating?.review_count ?? 0,
  };
}

/**
 * Slug d'un restaurant actif pour alimenter les liens « démo » de la landing.
 * Caché (cookieless) pour garder la page d'accueil statique/ISR.
 */
export function getDemoRestaurantSlug(): Promise<string | null> {
  return unstable_cache(
    async (): Promise<string | null> => {
      try {
        const supabase = publicClient();
        const { data } = await supabase
          .from('restaurants')
          .select('slug')
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle<{ slug: string }>();
        return data?.slug ?? null;
      } catch {
        return null;
      }
    },
    ['demo-restaurant-slug'],
    { tags: ['demo-restaurant'], revalidate: 300 },
  )();
}

export interface ShowcaseRestaurant {
  name: string;
  slug: string;
  city: string | null;
  description: string | null;
  cover_url: string | null;
}

/**
 * Les meilleurs restaurants actifs, mis en avant sur la landing.
 * Classement : présence d'un visuel de couverture → meilleure note moyenne →
 * nombre d'avis → commandes livrées → ancienneté. On ne remonte donc que des
 * restaurants « présentables » et les plus appréciés.
 */
export function getShowcaseRestaurants(limit = 3): Promise<ShowcaseRestaurant[]> {
  return unstable_cache(
    async (): Promise<ShowcaseRestaurant[]> => {
      try {
        const supabase = publicClient();
        const { data: rows } = await supabase
          .from('restaurants')
          .select('id, name, slug, city, description, cover_url, created_at')
          .eq('status', 'active')
          .returns<(ShowcaseRestaurant & { id: string; created_at: string })[]>();
        const restaurants = rows ?? [];
        if (restaurants.length === 0) return [];

        const ids = restaurants.map((r) => r.id);
        const [{ data: reviews }, { data: delivered }] = await Promise.all([
          supabase.from('order_reviews').select('restaurant_id, rating').in('restaurant_id', ids),
          supabase
            .from('orders')
            .select('restaurant_id')
            .eq('status', 'delivered')
            .in('restaurant_id', ids),
        ]);

        const stats = new Map<string, { sum: number; count: number; orders: number }>();
        for (const id of ids) stats.set(id, { sum: 0, count: 0, orders: 0 });
        for (const rv of (reviews ?? []) as { restaurant_id: string; rating: number }[]) {
          const s = stats.get(rv.restaurant_id);
          if (s) {
            s.sum += Number(rv.rating) || 0;
            s.count += 1;
          }
        }
        for (const o of (delivered ?? []) as { restaurant_id: string }[]) {
          const s = stats.get(o.restaurant_id);
          if (s) s.orders += 1;
        }

        const scored = restaurants.map((r) => {
          const s = stats.get(r.id)!;
          return {
            r,
            hasCover: r.cover_url ? 1 : 0,
            avg: s.count > 0 ? s.sum / s.count : 0,
            count: s.count,
            orders: s.orders,
            created: new Date(r.created_at).getTime(),
          };
        });
        scored.sort(
          (a, b) =>
            b.hasCover - a.hasCover ||
            b.avg - a.avg ||
            b.count - a.count ||
            b.orders - a.orders ||
            a.created - b.created,
        );
        return scored.slice(0, limit).map(({ r }) => ({
          name: r.name,
          slug: r.slug,
          city: r.city,
          description: r.description,
          cover_url: r.cover_url,
        }));
      } catch {
        return [];
      }
    },
    ['showcase-restaurants', String(limit)],
    { tags: ['demo-restaurant'], revalidate: 300 },
  )();
}

export interface LandingPlan {
  id: string;
  name: string;
  monthly_price: number;
  driver_limit: number | null;
  description: string;
}

export interface LandingPricing {
  plans: LandingPlan[];
  trialDays: number;
  discount6: number;
  discount12: number;
}

/**
 * Tarifs affichés sur la landing (offres + essai + remises). Lecture publique
 * cookieless mémorisée ; invalidée par les Server Actions admin qui modifient
 * les offres/paramètres (revalidateTag('subscription-plans')).
 */
export function getLandingPricing(): Promise<LandingPricing> {
  return unstable_cache(
    async (): Promise<LandingPricing> => {
      try {
        const supabase = publicClient();
        const [{ data: plans }, { data: settings }] = await Promise.all([
          supabase
            .from('subscription_plans')
            .select('id, name, monthly_price, driver_limit, description')
            .eq('is_active', true)
            .order('sort_order')
            .returns<LandingPlan[]>(),
          supabase
            .from('platform_settings')
            .select('trial_days, discount_6m_percent, discount_12m_percent')
            .eq('id', 1)
            .maybeSingle<{
              trial_days: number;
              discount_6m_percent: number;
              discount_12m_percent: number;
            }>(),
        ]);
        return {
          plans: plans ?? [],
          trialDays: settings?.trial_days ?? 7,
          discount6: settings?.discount_6m_percent ?? 10,
          discount12: settings?.discount_12m_percent ?? 20,
        };
      } catch {
        return { plans: [], trialDays: 7, discount6: 10, discount12: 20 };
      }
    },
    ['landing-pricing'],
    { tags: ['subscription-plans'], revalidate: 300 },
  )();
}

export interface HomeData {
  restaurant: Restaurant | null;
  featured: MenuItem[];
  avgRating: number | null;
  reviewCount: number;
  /** null uniquement si le restaurant est introuvable. */
  estimatedDeliveryTime: number | null;
}

/** Données de la page d'accueil publique — mémorisées par slug. */
export function getHomeData(slug: string): Promise<HomeData> {
  return unstable_cache(
    async (): Promise<HomeData> => {
      const supabase = publicClient();
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle<Restaurant>();

      if (!restaurant) {
        return { restaurant: null, featured: [], avgRating: null, reviewCount: 0, estimatedDeliveryTime: null };
      }

      const [{ data: featuredRows }, { data: etaData }, { data: ratingData }] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('is_available', true)
          .eq('is_extra', false)
          .in('item_type', ['dish', 'offer'])
          .order('sort_order')
          .limit(6)
          .returns<MenuItem[]>(),
        supabase.rpc('get_delivery_estimate', { p_restaurant_id: restaurant.id }),
        supabase.rpc('get_restaurant_rating', { p_restaurant_id: restaurant.id }),
      ]);

      const { avgRating, reviewCount } = parseRating(ratingData);
      return {
        restaurant,
        featured: featuredRows ?? [],
        avgRating,
        reviewCount,
        estimatedDeliveryTime:
          typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time,
      };
    },
    ['public-home-data', slug],
    { tags: [restoTag(slug)], revalidate: PUBLIC_REVALIDATE_SECONDS },
  )();
}

export interface MenuData {
  restaurant: Restaurant | null;
  categories: MenuCategory[];
  items: MenuItem[];
  hours: OpeningHour[];
  extrasLinks: Pick<MenuItemExtra, 'menu_item_id' | 'extra_item_id' | 'is_free'>[];
  variants: MenuItemVariant[];
  avgRating: number | null;
  reviewCount: number;
  estimatedDeliveryTime: number | null;
}

/** Données de la page menu publique — mémorisées par slug. */
export function getMenuData(slug: string): Promise<MenuData> {
  return unstable_cache(
    async (): Promise<MenuData> => {
      const supabase = publicClient();
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle<Restaurant>();

      if (!restaurant) {
        return {
          restaurant: null,
          categories: [],
          items: [],
          hours: [],
          extrasLinks: [],
          variants: [],
          avgRating: null,
          reviewCount: 0,
          estimatedDeliveryTime: null,
        };
      }

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

      const { avgRating, reviewCount } = parseRating(ratingData);
      return {
        restaurant,
        categories: categories ?? [],
        items: items ?? [],
        hours: hours ?? [],
        extrasLinks: extrasLinks ?? [],
        variants: variantRows ?? [],
        avgRating,
        reviewCount,
        estimatedDeliveryTime:
          typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time,
      };
    },
    ['public-menu-data', slug],
    { tags: [restoTag(slug)], revalidate: PUBLIC_REVALIDATE_SECONDS },
  )();
}
