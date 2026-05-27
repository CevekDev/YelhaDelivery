import { notFound } from 'next/navigation';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemForm } from '../../item-form';
import { updateMenuItemAction } from '../../actions';
import type { MenuCategory, MenuItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function EditPlatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle<MenuItem>(),
    supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order')
      .returns<MenuCategory[]>(),
  ]);

  if (!item) notFound();

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Modifier « {item.name} »</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            mode="edit"
            categories={categories ?? []}
            item={item}
            action={updateMenuItemAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
