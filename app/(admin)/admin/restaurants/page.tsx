import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import type { Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminRestaurantsPage() {
  await requireRole('admin');
  const admin = await createAdminClient();
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Restaurant[]>();

  return (
    <div className="container space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Restaurants</h1>
        <Button asChild>
          <Link href="/admin/restaurants/nouveau">+ Créer un restaurant</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste ({restaurants?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!restaurants || restaurants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun restaurant pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {restaurants.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      /r/{r.slug} · créé {formatRelativeTime(r.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        r.status === 'active'
                          ? 'success'
                          : r.status === 'suspended'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                    {r.is_open && <Badge variant="info">ouvert</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
