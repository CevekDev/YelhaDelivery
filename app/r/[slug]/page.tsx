import { notFound, redirect } from 'next/navigation';
import { getTemplate, templateSeoDefaults } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import { HomeView } from '@/components/site/home-view';
import { restaurantMetadata, restaurantJsonLd, serializeJsonLd } from '@/lib/seo';
import { getHomeData } from '@/lib/public-data';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { restaurant } = await getHomeData(slug);
  if (!restaurant) return { title: 'Restaurant introuvable' };
  return restaurantMetadata(
    { ...restaurant, slug, coverUrl: restaurant.cover_url, logoUrl: restaurant.logo_url },
    'home',
  );
}

export default async function RestaurantHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { restaurant, featured, avgRating, reviewCount, estimatedDeliveryTime } =
    await getHomeData(slug);

  if (!restaurant) notFound();

  // Page d'accueil désactivée → on redirige vers le menu (toujours présent).
  if (!restaurant.home_enabled) redirect(`/r/${slug}/menu`);

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
    { ratingValue: avgRating, reviewCount },
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <HomeView
        template={template}
        restaurant={restaurant}
        slug={slug}
        featured={featured}
        avgRating={avgRating}
        reviewCount={reviewCount}
        estimatedDeliveryTime={estimatedDeliveryTime ?? restaurant.estimated_delivery_time}
      />
    </SiteShell>
    </>
  );
}
