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
 * Restaurants actifs mis en avant sur la landing (« exemples de sites »).
 * Preuve concrète : de vrais sites créés avec la plateforme.
 */
export function getShowcaseRestaurants(limit = 6): Promise<ShowcaseRestaurant[]> {
  return unstable_cache(
    async (): Promise<ShowcaseRestaurant[]> => {
      try {
        const supabase = publicClient();
        const { data } = await supabase
          .from('restaurants')
          .select('name, slug, city, description, cover_url')
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(limit)
          .returns<ShowcaseRestaurant[]>();
        return data ?? [];
      } catch {
        return [];
      }
    },
    ['showcase-restaurants', String(limit)],
    { tags: ['demo-restaurant'], revalidate: 300 },
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
