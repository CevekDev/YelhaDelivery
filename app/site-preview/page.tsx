import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import { HomeView } from '@/components/site/home-view';
import type { MenuItem } from '@/types/database';

// Aperçu privé de la page d'accueil pour le restaurateur connecté.
// Rend EXACTEMENT les mêmes composants que le site public (WYSIWYG), mais avec
// les données du propriétaire quel que soit le statut du restaurant (donc
// utilisable avant activation). Hors du groupe (dashboard) → pas de chrome.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Aperçu du site', robots: { index: false } };

export default async function SitePreviewPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

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

  type RatingRow = { avg_rating: number | null; review_count: number };
  const rating = ((ratingData ?? []) as unknown as RatingRow[])[0];
  const reviewCount = rating?.review_count ?? 0;
  const avgRating = rating?.avg_rating != null ? Number(rating.avg_rating) : null;
  const estimatedDeliveryTime =
    typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time;

  const template = getTemplate(restaurant.template_id);

  return (
    <SiteShell template={template} restaurant={restaurant} slug={restaurant.slug}>
      <HomeView
        template={template}
        restaurant={restaurant}
        slug={restaurant.slug}
        featured={featuredRows ?? []}
        avgRating={avgRating}
        reviewCount={reviewCount}
        estimatedDeliveryTime={estimatedDeliveryTime}
      />
    </SiteShell>
  );
}
