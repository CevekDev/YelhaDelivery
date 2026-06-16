import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import { HomeView } from '@/components/site/home-view';
import { restaurantMetadata, restaurantJsonLd } from '@/lib/seo';
import type { MenuItem, Restaurant } from '@/types/database';

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
  return restaurantMetadata(
    { ...data, slug, coverUrl: data.cover_url },
    'home',
  );
}

export default async function RestaurantHomePage({
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

  // Page d'accueil désactivée → on redirige vers le menu (toujours présent).
  if (!restaurant.home_enabled) redirect(`/r/${slug}/menu`);

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <HomeView
        template={template}
        restaurant={restaurant}
        slug={slug}
        featured={featuredRows ?? []}
        avgRating={avgRating}
        reviewCount={reviewCount}
        estimatedDeliveryTime={estimatedDeliveryTime}
      />
    </SiteShell>
    </>
  );
}
