import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { OrderReview } from '@/types/database';

export const dynamic = 'force-dynamic';

interface ReviewWithOrder extends OrderReview {
  orders: {
    order_number: string;
    customer_name: string;
  } | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'}`}
        />
      ))}
    </div>
  );
}

export default async function AvisPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from('order_reviews')
    .select('*, orders(order_number, customer_name)')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .returns<ReviewWithOrder[]>();

  const allReviews = reviews ?? [];

  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      : 0;

  const countByRating = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: allReviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <div className="container max-w-3xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Avis clients"
        description={`${allReviews.length} avis au total.`}
      />

      {allReviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-muted-foreground">Aucun avis pour le moment</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les avis clients apparaissent ici après la livraison.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats globales */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-8 p-6">
              <div className="text-center">
                <p className="font-display text-5xl font-extrabold tabular-nums">
                  {avgRating.toFixed(1)}
                </p>
                <StarRating rating={Math.round(avgRating)} />
                <p className="mt-1 text-xs text-muted-foreground">{allReviews.length} avis</p>
              </div>
              <div className="flex-1 space-y-1.5 min-w-[160px]">
                {countByRating.map(({ rating, count }) => {
                  const pct = allReviews.length > 0 ? (count / allReviews.length) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 text-xs">
                      <span className="w-4 shrink-0 text-right font-semibold">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-yellow-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Liste des avis */}
          <div className="space-y-3">
            {allReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {review.orders?.customer_name ?? 'Client'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commande {review.orders?.order_number ?? '—'} ·{' '}
                        {new Date(review.created_at).toLocaleDateString('fr-DZ', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm italic text-muted-foreground">
                      « {review.comment} »
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
