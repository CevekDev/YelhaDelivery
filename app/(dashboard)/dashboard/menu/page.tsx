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

  const allItems = items ?? [];

  // Séparer par type
  const dishes = allItems.filter((i) => i.item_type === 'dish' || (!i.item_type && !i.is_extra));
  const sauces = allItems.filter((i) => i.item_type === 'sauce' || (i.is_extra && i.item_type === 'dish'));
  const supplements = allItems.filter((i) => i.item_type === 'supplement');
  const offers = allItems.filter((i) => i.item_type === 'offer');

  // Plats par catégorie
  const dishByCategory = new Map<string | null, MenuItem[]>();
  dishes.forEach((i) => {
    const key = i.category_id;
    if (!dishByCategory.has(key)) dishByCategory.set(key, []);
    dishByCategory.get(key)!.push(i);
  });

  const totalItems = allItems.length;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Menu"
        title="Mes plats"
        description={`${totalItems} article${totalItems > 1 ? 's' : ''} · ${categories?.length ?? 0} catégorie${(categories?.length ?? 0) > 1 ? 's' : ''}`}
        actions={
          <Button asChild>
            <Link href="/dashboard/menu/nouveau">
              <Plus className="h-4 w-4" />
              Nouveau
            </Link>
          </Button>
        }
      />

      {/* Catégories */}
      <PanelCard padded={false}>
        <PanelHeader
          title="Catégories"
          description="Regroupez vos plats par sections (Entrées, Plats, Desserts…)"
        />
        <div className="p-5 md:p-6">
          <CategoryForm categories={categories ?? []} />
        </div>
      </PanelCard>

      {/* État vide */}
      {(categories ?? []).length === 0 && totalItems === 0 && (
        <PanelCard className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-lg font-bold">Votre menu est vide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez une catégorie ci-dessus puis ajoutez vos premiers plats.
          </p>
        </PanelCard>
      )}

      {/* ═══════════════════════════════════════════════
          Section Plats
      ═══════════════════════════════════════════════ */}
      {(dishes.length > 0 || (categories ?? []).length > 0) && (
        <div className="space-y-5">
          <SectionTitle icon="🍽️" title="Plats" count={dishes.length} href="/dashboard/menu/nouveau?type=dish" />

          {(categories ?? []).map((cat) => (
            <PanelCard key={cat.id} padded={false}>
              <PanelHeader
                title={cat.name}
                description={`${dishByCategory.get(cat.id)?.length ?? 0} plat(s)`}
                actions={
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/menu/nouveau?category=${cat.id}&type=dish`}>
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </Link>
                  </Button>
                }
              />
              <ItemsTable items={dishByCategory.get(cat.id) ?? []} />
            </PanelCard>
          ))}

          {dishByCategory.has(null) && (dishByCategory.get(null)?.length ?? 0) > 0 && (
            <PanelCard padded={false}>
              <PanelHeader title="Sans catégorie" />
              <ItemsTable items={dishByCategory.get(null) ?? []} />
            </PanelCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          Section Offres du moment
      ═══════════════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionTitle
          icon="🎁"
          title="Offres du moment"
          count={offers.length}
          href="/dashboard/menu/nouveau?type=offer"
          description="Packs, promotions, offres spéciales affichées en priorité sur votre page publique"
        />
        {offers.length > 0 && (
          <PanelCard padded={false}>
            <ItemsTable items={offers} showOfferBadge />
          </PanelCard>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          Section Sauces
      ═══════════════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionTitle
          icon="🥫"
          title="Sauces"
          count={sauces.length}
          href="/dashboard/menu/nouveau?type=sauce"
          description="Sauces proposées en option sur vos plats. Peuvent être gratuites ou payantes."
        />
        {sauces.length > 0 && (
          <PanelCard padded={false}>
            <ItemsTable items={sauces} />
          </PanelCard>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          Section Suppléments
      ═══════════════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionTitle
          icon="➕"
          title="Suppléments"
          count={supplements.length}
          href="/dashboard/menu/nouveau?type=supplement"
          description="Extras payants proposés à la carte : frites, boissons, accompagnements…"
        />
        {supplements.length > 0 && (
          <PanelCard padded={false}>
            <ItemsTable items={supplements} />
          </PanelCard>
        )}
      </div>
    </div>
  );
}

/* ── SectionTitle ───────────────────────────────────────── */

function SectionTitle({
  icon,
  title,
  count,
  href,
  description,
}: {
  icon: string;
  title: string;
  count: number;
  href: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {count}
          </span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link href={href}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Link>
      </Button>
    </div>
  );
}

/* ── ItemsTable ─────────────────────────────────────────── */

function ItemsTable({
  items,
  showOfferBadge = false,
}: {
  items: MenuItem[];
  showOfferBadge?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground md:px-6">
        Aucun article dans cette section.
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
                {item.item_type === 'sauce' ? '🥫' : item.item_type === 'supplement' ? '➕' : item.item_type === 'offer' ? '🎁' : '🍽️'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{item.name}</p>
              {showOfferBadge && item.offer_badge && (
                <Badge variant="default" className="shrink-0 bg-amber-500 text-white hover:bg-amber-500">
                  {item.offer_badge}
                </Badge>
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
            {showOfferBadge && item.offer_description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-amber-700">{item.offer_description}</p>
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
