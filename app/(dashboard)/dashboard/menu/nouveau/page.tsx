import Link from 'next/link';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { ItemForm } from '../item-form';
import { createMenuItemAction } from '../actions';
import { ArrowLeft } from 'lucide-react';
import type { MenuCategory, MenuItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function NouveauPlatPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: categories }, { data: extras }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order')
      .returns<MenuCategory[]>(),
    supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_extra', true)
      .eq('is_available', true)
      .order('sort_order')
      .returns<MenuItem[]>(),
  ]);

  return (
    <div className="container max-w-2xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Menu"
        title="Nouveau plat"
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
          action={createMenuItemAction}
        />
      </PanelCard>
    </div>
  );
}
