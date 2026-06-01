'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import type { MenuCategory, MenuItem, MenuItemVariant } from '@/types/database';
import type { FormResult } from './actions';

interface VariantRow {
  id?: string;
  name: string;
  price: string;
}

interface Props {
  mode: 'create' | 'edit';
  categories: MenuCategory[];
  item?: MenuItem;
  allExtras: MenuItem[];
  linkedExtraIds: string[];
  existingVariants?: MenuItemVariant[];
  action: (fd: FormData) => Promise<FormResult>;
}

export function ItemForm({ mode, categories, item, allExtras, linkedExtraIds, existingVariants, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [price, setPrice] = useState<number>(Number(item?.price ?? 0));
  const [promoPrice, setPromoPrice] = useState<string>(
    item?.promo_price != null ? String(item.promo_price) : '',
  );
  const [isExtra, setIsExtra] = useState(item?.is_extra ?? false);
  const [keptImageUrls, setKeptImageUrls] = useState<string[]>(item?.image_urls ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    (existingVariants ?? []).map((v) => ({ id: v.id, name: v.name, price: String(v.price) })),
  );

  const promoNum = promoPrice ? Number(promoPrice) : null;
  const discount =
    promoNum && price > 0 && promoNum < price
      ? Math.round(((price - promoNum) / price) * 100)
      : 0;

  const updateVariant = (i: number, field: 'name' | 'price', value: string) => {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (i: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
          keptImageUrls.forEach((url) => fd.append('keep_image_url[]', url));
          fd.set('variant_count', String(variants.length));
          const res = await action(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          }
        })
      }
      className="space-y-5"
    >
      {item && <input type="hidden" name="id" value={item.id} />}

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom du plat *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={item?.name}
          placeholder="Ex: Couscous royal"
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
      </div>

      {/* Prix + catégorie */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Prix (DA) *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            aria-invalid={!!fieldErrors.price}
          />
          {fieldErrors.price && <p className="text-xs text-destructive">{fieldErrors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Catégorie</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={item?.category_id ?? ''}
            className="flex h-11 w-full rounded-md border border-border bg-input px-3 text-sm"
          >
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Promo */}
      <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="promo_price" className="flex items-center gap-2">
            <span className="text-primary">🏷️</span> Prix promo (optionnel)
          </Label>
          {discount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              -{discount}%
            </span>
          )}
        </div>
        <Input
          id="promo_price"
          name="promo_price"
          type="number"
          step="0.01"
          min="0"
          value={promoPrice}
          onChange={(e) => setPromoPrice(e.target.value)}
          placeholder="Laisser vide pour aucune promo"
          aria-invalid={!!fieldErrors.promo_price}
        />
        {discount > 0 && (
          <p className="text-xs text-success">
            Affiché aux clients :{' '}
            <span className="line-through opacity-60">{formatPrice(price)}</span>{' '}
            <span className="font-bold text-primary">{formatPrice(promoNum!)}</span>
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          defaultValue={item?.description ?? ''}
          placeholder="Ingrédients, accompagnement, suggestions…"
        />
      </div>

      {/* Ordre + dispo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Ordre d&apos;affichage</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            max="999"
            defaultValue={item?.sort_order ?? 0}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_available"
              value="true"
              defaultChecked={item?.is_available ?? true}
              className="h-4 w-4 accent-primary"
            />
            Disponible
          </label>
        </div>
      </div>

      {/* Marquer comme supplément */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 hover:border-primary/40">
        <input
          type="checkbox"
          name="is_extra"
          value="true"
          checked={isExtra}
          onChange={(e) => setIsExtra(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Marquer comme supplément / sauce</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Apparaîtra dans la section « Suppléments » et pourra être attaché à d&apos;autres plats.
          </p>
        </div>
      </label>

      {/* === Variantes (uniquement si ce n'est pas un supplément) === */}
      {!isExtra && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-4">
          <div>
            <p className="text-sm font-semibold">Variantes (ex: Petit / Grand / XXL)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Si des variantes sont définies, le client devra en choisir une avant d&apos;ajouter au panier.
              Le prix de base ci-dessus sera ignoré au profit du prix de la variante.
            </p>
          </div>

          {variants.map((v, i) => (
            <div key={i} className="flex items-end gap-2">
              {v.id && <input type="hidden" name={`variant_id_${i}`} value={v.id} />}
              <div className="flex-1 space-y-1">
                <Label htmlFor={`variant_name_${i}`} className="text-xs text-muted-foreground">
                  Nom
                </Label>
                <Input
                  id={`variant_name_${i}`}
                  name={`variant_name_${i}`}
                  value={v.name}
                  onChange={(e) => updateVariant(i, 'name', e.target.value)}
                  placeholder="Ex: Grand"
                  maxLength={60}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label htmlFor={`variant_price_${i}`} className="text-xs text-muted-foreground">
                  Prix (DA)
                </Label>
                <Input
                  id={`variant_price_${i}`}
                  name={`variant_price_${i}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={v.price}
                  onChange={(e) => updateVariant(i, 'price', e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(i)}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                aria-label="Supprimer la variante"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((prev) => [...prev, { name: '', price: '' }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter une variante
          </Button>
        </div>
      )}

      {/* === Photo principale === */}
      <div className="space-y-2">
        <Label htmlFor="image">Photo principale (jpg, png, webp — max 5 Mo)</Label>
        {item?.image_url && (
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <Image src={item.image_url} alt="" fill className="object-cover" sizes="80px" />
          </div>
        )}
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
        />
        {item?.image_url && (
          <p className="text-xs text-muted-foreground">Laissez vide pour conserver l&apos;image actuelle.</p>
        )}
      </div>

      {/* === Photos supplémentaires === */}
      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div>
          <p className="text-sm font-semibold">Photos supplémentaires</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jusqu&apos;à 3 photos supplémentaires affichées dans la galerie du plat.
          </p>
        </div>

        {keptImageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keptImageUrls.map((url) => (
              <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                <button
                  type="button"
                  onClick={() => setKeptImageUrls((prev) => prev.filter((u) => u !== url))}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Label htmlFor={`image_${i}`} className="text-xs text-muted-foreground">
              Photo {i}
            </Label>
            <Input
              id={`image_${i}`}
              name={`image_${i}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:text-foreground"
            />
          </div>
        ))}
      </div>

      {/* === Suppléments liés === */}
      {!isExtra && allExtras.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-4">
          <div>
            <p className="text-sm font-semibold">Suppléments disponibles pour ce plat</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Le client pourra les ajouter à sa commande depuis la page du plat.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allExtras.map((extra) => (
              <label
                key={extra.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40"
              >
                <input
                  type="checkbox"
                  name="extra_ids[]"
                  value={extra.id}
                  defaultChecked={linkedExtraIds.includes(extra.id)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{extra.name}</p>
                  <p className="text-xs text-primary">+{formatPrice(extra.promo_price ?? extra.price)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isExtra && allExtras.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          Aucun supplément défini. Créez d&apos;abord un plat marqué « supplément/sauce » pour pouvoir l&apos;attacher ici.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : mode === 'create' ? 'Créer le plat' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
