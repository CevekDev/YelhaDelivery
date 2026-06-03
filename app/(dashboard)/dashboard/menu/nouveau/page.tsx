import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { ItemForm } from '../item-form';
import { createMenuItemAction } from '../actions';
import { ArrowLeft } from 'lucide-react';
import type { MenuCategory, MenuItem, MenuItemType } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function NouveauPlatPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: categories }, { data: extras }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order')
      .returns<MenuCategory[]>(),
    // Charger sauces + suppléments pour le picker d'extras
    supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .in('item_type', ['sauce', 'supplement'])
      .eq('is_available', true)
      .order('sort_order')
      .returns<MenuItem[]>(),
  ]);

  // Pré-sélectionner le type depuis l'URL (?type=sauce)
  const validTypes: MenuItemType[] = ['dish', 'sauce', 'supplement', 'offer'];
  const defaultType: MenuItemType = validTypes.includes(type as MenuItemType)
    ? (type as MenuItemType)
    : 'dish';

  // Pré-sélectionner la catégorie depuis l'URL (?category=uuid)
  const defaultCategory = category ?? '';

  const typeLabels: Record<MenuItemType, string> = {
    dish: 'Nouveau plat',
    sauce: 'Nouvelle sauce',
    supplement: 'Nouveau supplément',
    offer: 'Nouvelle offre',
  };

  return (
    <div className="container max-w-2xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Menu"
        title={typeLabels[defaultType]}
        description="Ajoutez les informations qui apparaîtront sur votre page publique."
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
          mode="create"
          categories={categories ?? []}
          allExtras={extras ?? []}
          linkedExtraIds={[]}
          linkedFreeExtraIds={[]}
          action={createMenuItemAction}
          defaultType={defaultType}
          defaultCategoryId={defaultCategory}
        />
      </PanelCard>
    </div>
  );
}
