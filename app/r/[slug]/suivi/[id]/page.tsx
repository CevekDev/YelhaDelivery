import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrackingClient } from './tracking-client';
import { SiteShell } from '@/components/site/site-shell';
import { getTemplate } from '@/lib/templates';
import type { OrderStatus, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PublicOrder {
  id: string;
  order_number: string;
  restaurant_slug: string;
  restaurant_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_address: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  created_at: string;
  estimated_delivery_time: number;
  cancellation_reason: string | null;
  delivery_fee_set_at: string | null;
}

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const [{ data }, restaurantRes] = await Promise.all([
    supabase.rpc('get_public_order', { p_id: id }),
    supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle<Restaurant>(),
  ]);
  const rows = (data ?? []) as unknown as PublicOrder[];
  const restaurant = restaurantRes.data;

  const order = rows[0];
  if (!order || !restaurant || order.restaurant_slug !== slug) notFound();

  const template = getTemplate(restaurant.template_id);

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <TrackingClient slug={slug} initial={order} />
    </SiteShell>
  );
}
