import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { ItemForm } from '../../item-form';
import { updateMenuItemAction } from '../../actions';
import { ArrowLeft } from 'lucide-react';
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
          action={updateMenuItemAction}
        />
      </PanelCard>
    </div>
  );
}
