'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateSlug } from '@/lib/utils';
import { updateRestaurantAction } from './actions';
import type { Restaurant } from '@/types/database';

export function SettingsForm({ restaurant }: { restaurant: Restaurant | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [name, setName] = useState(restaurant?.name ?? '');
  const [slug, setSlug] = useState(restaurant?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!restaurant);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(false);
          setFieldErrors({});
          const res = await updateRestaurantAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            setSuccess(true);
            router.refresh();
          }
        })
      }
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nom du restaurant *</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(generateSlug(e.target.value));
          }}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL publique *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">delivery.yelha.net/r/</span>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={80}
            aria-invalid={!!fieldErrors.slug}
          />
        </div>
        {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={500}
          defaultValue={restaurant?.description ?? ''}
          placeholder="Présentez votre cuisine en quelques mots…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" name="city" maxLength={80} defaultValue={restaurant?.city ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            pattern="0[5-7][0-9]{8}"
            placeholder="0555123456"
            defaultValue={restaurant?.phone ?? ''}
            aria-invalid={!!fieldErrors.phone}
          />
          {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          name="address"
          maxLength={300}
          defaultValue={restaurant?.address ?? ''}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="delivery_fee">Frais livraison (DZD)</Label>
          <Input
            id="delivery_fee"
            name="delivery_fee"
            type="number"
            min="0"
            step="0.01"
            defaultValue={restaurant?.delivery_fee ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_order">Min. commande (DZD)</Label>
          <Input
            id="min_order"
            name="min_order"
            type="number"
            min="0"
            step="0.01"
            defaultValue={restaurant?.min_order ?? 0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_delivery_time">Délai (min)</Label>
          <Input
            id="estimated_delivery_time"
            name="estimated_delivery_time"
            type="number"
            min="5"
            max="240"
            defaultValue={restaurant?.estimated_delivery_time ?? 30}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_open"
            value="true"
            defaultChecked={restaurant?.is_open ?? false}
            className="h-4 w-4 accent-primary"
          />
          Restaurant ouvert
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="accept_orders"
            value="true"
            defaultChecked={restaurant?.accept_orders ?? true}
            className="h-4 w-4 accent-primary"
          />
          Accepter les commandes
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Paramètres enregistrés.
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enregistrement…' : restaurant ? 'Enregistrer' : 'Créer mon restaurant'}
      </Button>
    </form>
  );
}
