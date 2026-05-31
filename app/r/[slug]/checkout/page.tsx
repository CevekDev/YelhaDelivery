import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CheckoutClient } from './checkout-client';
import type { Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Finaliser ma commande' };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(
      'id, name, slug, delivery_fee, min_order, is_open, accept_orders, status, estimated_delivery_time, free_delivery_above',
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant) notFound();

  // Estimation dynamique (moyenne glissante des livraisons récentes)
  const { data: etaData } = await supabase.rpc('get_delivery_estimate', {
    p_restaurant_id: restaurant.id,
  });
  const estimatedDeliveryTime =
    typeof etaData === 'number' ? etaData : restaurant.estimated_delivery_time;

  return (
    <CheckoutClient
      slug={slug}
      restaurantName={restaurant.name}
      deliveryFee={Number(restaurant.delivery_fee)}
      minOrder={Number(restaurant.min_order)}
      canOrder={restaurant.is_open && restaurant.accept_orders}
      estimatedDeliveryTime={estimatedDeliveryTime}
      freeDeliveryAbove={
        restaurant.free_delivery_above != null ? Number(restaurant.free_delivery_above) : null
      }
    />
  );
}
