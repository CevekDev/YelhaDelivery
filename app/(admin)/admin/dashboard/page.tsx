import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Store, ShoppingBag, Users, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole('admin');
  const admin = await createAdminClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: restaurantsCount },
    { count: ordersTodayCount },
    { count: usersCount },
    { data: deliveredToday },
  ] = await Promise.all([
    admin.from('restaurants').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin
      .from('orders')
      .select('total')
      .eq('status', 'delivered')
      .gte('created_at', startOfDay.toISOString()),
  ]);

  const revenueToday = (deliveredToday ?? []).reduce(
    (sum: number, o: { total: number }) => sum + Number(o.total),
    0,
  );

  return (
    <div className="container space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Vue d’ensemble</h1>
        <Button asChild>
          <Link href="/admin/restaurants/nouveau">+ Créer un restaurant</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Store} label="Restaurants" value={(restaurantsCount ?? 0).toString()} />
        <Stat icon={ShoppingBag} label="Commandes aujourd'hui" value={(ordersTodayCount ?? 0).toString()} />
        <Stat icon={Users} label="Utilisateurs" value={(usersCount ?? 0).toString()} />
        <Stat icon={TrendingUp} label="CA aujourd'hui (livré)" value={formatPrice(revenueToday)} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/15 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
