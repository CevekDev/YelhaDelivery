import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { formatRelativeTime } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  restaurant_id: string;
  order: { customer_name: string } | { customer_name: string }[] | null;
}

export default async function AdminAvisPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string }>;
}) {
  await requireRole('admin');
  const params = await searchParams;
  const ratingFilter = params.rating ? Number(params.rating) : null;

  const admin = await createClient();

  let q = admin
    .from('order_reviews')
    .select('id, rating, comment, created_at, restaurant_id, order:orders(customer_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (ratingFilter != null && ratingFilter >= 1 && ratingFilter <= 5) {
    q = q.eq('rating', ratingFilter);
  }
  const [{ data: reviews }, { data: restaurants }] = await Promise.all([
    q.returns<ReviewRow[]>(),
    admin
      .from('restaurants')
      .select('id, name, slug')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug'>[]>(),
  ]);
  const restoById = new Map((restaurants ?? []).map((r) => [r.id, r]));

  // Distribution rating
  const counts = new Array(6).fill(0);
  for (const r of reviews ?? []) if (r.rating >= 1 && r.rating <= 5) counts[r.rating]!++;
  const total = counts.reduce((a: number, b: number) => a + b, 0);
  const avg =
    total > 0
      ? (counts.reduce((s: number, c: number, i: number) => s + c * i, 0) / total).toFixed(1)
      : '—';

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Modération"
        title="Avis clients"
        description={`${reviews?.length ?? 0} avis affichés · note moyenne ${avg}/5`}
      />

      {/* Distribution */}
      <PanelCard>
        <PanelHeader title="Distribution" />
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = counts[n] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <Link
                key={n}
                href={`/admin/avis?rating=${n}`}
                className={
                  'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ' +
                  (ratingFilter === n ? 'bg-primary/5' : 'hover:bg-muted/40')
                }
              >
                <span className="flex w-14 shrink-0 items-center gap-0.5 text-xs font-semibold">
                  {n}
                  <Star className="h-3 w-3 fill-warning text-warning" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-warning" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">
                  {count} · {pct}%
                </span>
              </Link>
            );
          })}
          {ratingFilter && (
            <Link
              href="/admin/avis"
              className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
            >
              ← Retirer le filtre
            </Link>
          )}
        </div>
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader title={`Avis (${reviews?.length ?? 0})`} />
        {!reviews || reviews.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-bold">Aucun avis</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les clients laissent leur avis après une livraison.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((r) => {
              const resto = restoById.get(r.restaurant_id);
              const customerName = Array.isArray(r.order)
                ? r.order[0]?.customer_name
                : r.order?.customer_name;
              return (
                <li key={r.id} className="px-5 py-4 md:px-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={
                            'h-4 w-4 ' +
                            (n <= r.rating ? 'fill-warning text-warning' : 'fill-muted text-muted')
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {customerName ?? 'Client'} · chez{' '}
                      {resto ? (
                        <Link
                          href={`/admin/restaurants/${resto.id}`}
                          className="font-semibold hover:text-primary hover:underline"
                        >
                          {resto.name}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      · {formatRelativeTime(r.created_at)}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
