import Link from 'next/link';
import Image from 'next/image';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { CategoryForm } from './category-form';
import { ItemRowActions } from './item-row-actions';
import type { MenuCategory, MenuItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
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
      .order('sort_order')
      .returns<MenuItem[]>(),
  ]);

  const itemsByCategory = new Map<string | null, MenuItem[]>();
  (items ?? []).forEach((i) => {
    const key = i.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(i);
  });

  const totalItems = items?.length ?? 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Menu"
        title="Mes plats"
        description={`${totalItems} plat${totalItems > 1 ? 's' : ''} · ${categories?.length ?? 0} catégorie${(categories?.length ?? 0) > 1 ? 's' : ''}`}
        actions={
          <Button asChild>
            <Link href="/dashboard/menu/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau plat
            </Link>
          </Button>
        }
      />

      <PanelCard padded={false}>
        <PanelHeader
          title="Catégories"
          description="Regroupez vos plats par sections (Entrées, Plats, Desserts…)"
        />
        <div className="p-5 md:p-6">
          <CategoryForm categories={categories ?? []} />
        </div>
      </PanelCard>

      <div className="space-y-5">
        {(categories ?? []).length === 0 && totalItems === 0 && (
          <PanelCard className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">Votre menu est vide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Commencez par créer une catégorie ci-dessus, puis ajoutez vos premiers plats.
            </p>
          </PanelCard>
        )}

        {(categories ?? []).map((cat) => (
          <PanelCard key={cat.id} padded={false}>
            <PanelHeader
              title={cat.name}
              description={`${itemsByCategory.get(cat.id)?.length ?? 0} plat(s)`}
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/menu/nouveau?category=${cat.id}`}>
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </Link>
                </Button>
              }
            />
            <ItemsTable items={itemsByCategory.get(cat.id) ?? []} />
          </PanelCard>
        ))}

        {itemsByCategory.has(null) && (
          <PanelCard padded={false}>
            <PanelHeader title="Sans catégorie" />
            <ItemsTable items={itemsByCategory.get(null) ?? []} />
          </PanelCard>
        )}
      </div>
    </div>
  );
}

function ItemsTable({ items }: { items: MenuItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground md:px-6">
        Aucun plat dans cette catégorie.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40 md:px-6"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.image_url ? (
              <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">
                🍽️
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">{item.name}</p>
              {item.is_extra && (
                <Badge variant="info" className="shrink-0">Supplément</Badge>
              )}
              {item.promo_price != null && (
                <Badge variant="default" className="shrink-0">
                  -{Math.round(((item.price - item.promo_price) / item.price) * 100)}%
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge variant={item.is_available ? 'success' : 'secondary'}>
              {item.is_available ? 'Disponible' : 'Indispo'}
            </Badge>
            <div className="hidden text-right sm:block">
              {item.promo_price != null ? (
                <>
                  <span className="block text-[10px] text-muted-foreground line-through">
                    {formatPrice(item.price)}
                  </span>
                  <span className="block font-display text-sm font-bold text-primary tabular-nums">
                    {formatPrice(item.promo_price)}
                  </span>
                </>
              ) : (
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatPrice(item.price)}
                </span>
              )}
            </div>
            <ItemRowActions item={item} />
          </div>
        </li>
      ))}
    </ul>
  );
}
