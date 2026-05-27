import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemForm } from '../item-form';
import { createMenuItemAction } from '../actions';
import type { MenuCategory } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function NouveauPlatPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order')
    .returns<MenuCategory[]>();

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau plat</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm mode="create" categories={categories ?? []} action={createMenuItemAction} />
        </CardContent>
      </Card>
    </div>
  );
}
