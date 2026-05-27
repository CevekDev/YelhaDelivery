import Link from 'next/link';
import Image from 'next/image';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Plus } from 'lucide-react';
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

  return (
    <div className="container space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Catégories et plats visibles sur votre page publique.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/menu/nouveau">
            <Plus className="h-4 w-4" /> Ajouter un plat
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm categories={categories ?? []} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {(categories ?? []).length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Créez d’abord au moins une catégorie ci-dessus.
            </CardContent>
          </Card>
        )}

        {(categories ?? []).map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{cat.name}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {itemsByCategory.get(cat.id)?.length ?? 0} plat(s)
              </span>
            </CardHeader>
            <CardContent>
              <ItemsTable items={itemsByCategory.get(cat.id) ?? []} />
            </CardContent>
          </Card>
        ))}

        {itemsByCategory.has(null) && (
          <Card>
            <CardHeader>
              <CardTitle>Sans catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemsTable items={itemsByCategory.get(null) ?? []} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ItemsTable({ items }: { items: MenuItem[] }) {
  if (items.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Aucun plat dans cette catégorie.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 py-3">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-md object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-md border border-dashed border-border" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            {item.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge variant={item.is_available ? 'success' : 'secondary'}>
              {item.is_available ? 'Disponible' : 'Indispo'}
            </Badge>
            <span className="font-semibold">{formatPrice(item.price)}</span>
            <ItemRowActions item={item} />
          </div>
        </li>
      ))}
    </ul>
  );
}
