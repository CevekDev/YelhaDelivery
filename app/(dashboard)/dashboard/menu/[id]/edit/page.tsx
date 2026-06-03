import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { ItemForm } from '../../item-form';
import { updateMenuItemAction } from '../../actions';
import { ArrowLeft } from 'lucide-react';
import type { MenuCategory, MenuItem, MenuItemExtra, MenuItemVariant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function EditPlatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: item }, { data: categories }, { data: extras }, { data: linkedRows }, { data: variantRows }] =
    await Promise.all([
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
      // Charger sauces + suppléments (par item_type OU fallback is_extra pour données legacy)
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .in('item_type', ['sauce', 'supplement'])
        .eq('is_available', true)
        .order('sort_order')
        .returns<MenuItem[]>(),
      supabase
        .from('menu_item_extras')
        .select('extra_item_id, is_free')
        .eq('menu_item_id', id)
        .returns<Pick<MenuItemExtra, 'extra_item_id' | 'is_free'>[]>(),
      supabase
        .from('menu_item_variants')
        .select('*')
        .eq('menu_item_id', id)
        .order('sort_order')
        .returns<MenuItemVariant[]>(),
    ]);

  if (!item) notFound();

  const linkedExtraIds = (linkedRows ?? []).map((r) => r.extra_item_id);
  const linkedFreeExtraIds = (linkedRows ?? [])
    .filter((r) => r.is_free)
    .map((r) => r.extra_item_id);
  const existingVariants = variantRows ?? [];

  // Fallback: si la migration n'a pas encore été appliquée, inclure aussi les is_extra legacy
  // (pas nécessaire une fois la migration en prod, mais garde la robustesse)
  const allExtras = extras ?? [];

  return (
    <div className="container max-w-2xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Menu"
        title={item.name}
        description="Modifier ce plat. Les changements sont visibles immédiatement sur votre page publique."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/menu">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />
      <PanelCard>
        <ItemForm
          mode="edit"
          categories={categories ?? []}
          item={item}
          allExtras={allExtras}
          linkedExtraIds={linkedExtraIds}
          linkedFreeExtraIds={linkedFreeExtraIds}
          existingVariants={existingVariants}
          action={updateMenuItemAction}
        />
      </PanelCard>
    </div>
  );
}
