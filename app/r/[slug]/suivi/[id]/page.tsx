import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrackingClient } from './tracking-client';
import type { OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PublicOrder {
  id: string;
  order_number: string;
  restaurant_slug: string;
  restaurant_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_address: string;
  total: number;
  created_at: string;
  estimated_delivery_time: number;
  cancellation_reason: string | null;
}

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_public_order', { p_id: id });
  const rows = (data ?? []) as unknown as PublicOrder[];

  const order = rows[0];
  if (!order || order.restaurant_slug !== slug) notFound();

  return <TrackingClient slug={slug} initial={order} />;
}
