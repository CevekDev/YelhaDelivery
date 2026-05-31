'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import type { MenuCategory, MenuItem } from '@/types/database';
import type { FormResult } from './actions';

interface Props {
  mode: 'create' | 'edit';
  categories: MenuCategory[];
  item?: MenuItem;
  action: (fd: FormData) => Promise<FormResult>;
}

export function ItemForm({ mode, categories, item, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [price, setPrice] = useState<number>(Number(item?.price ?? 0));
  const [promoPrice, setPromoPrice] = useState<string>(
    item?.promo_price != null ? String(item.promo_price) : '',
  );

  const promoNum = promoPrice ? Number(promoPrice) : null;
  const discount =
    promoNum && price > 0 && promoNum < price
      ? Math.round(((price - promoNum) / price) * 100)
      : 0;

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
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

      {/* === Promo === */}
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
        {fieldErrors.promo_price && (
          <p className="text-xs text-destructive">{fieldErrors.promo_price}</p>
        )}
      </div>

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

      {/* === Supplément === */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 hover:border-primary/40">
        <input
          type="checkbox"
          name="is_extra"
          value="true"
          defaultChecked={item?.is_extra ?? false}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div className="flex-1 text-sm">
          <p className="font-semibold">Marquer comme supplément / sauce</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Le plat apparaîtra dans une section « Suppléments » sur votre page publique
            (idéal pour les sauces, accompagnements, boissons à ajouter).
          </p>
        </div>
      </label>

      <div className="space-y-2">
        <Label htmlFor="image">Image (jpg, png, webp — max 5 Mo)</Label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
        />
        {item?.image_url && (
          <p className="text-xs text-muted-foreground">
            Une image est déjà associée. Laissez vide pour la conserver.
          </p>
        )}
      </div>

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
