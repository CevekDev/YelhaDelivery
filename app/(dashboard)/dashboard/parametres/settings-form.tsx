'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  const [removeBanner, setRemoveBanner] = useState(false);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(false);
          setFieldErrors({});
          if (removeBanner) fd.set('remove_banner_image', 'true');
          const res = await updateRestaurantAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            setSuccess(true);
            setRemoveBanner(false);
            router.refresh();
          }
        })
      }
      className="space-y-6"
    >
      {/* === Identité === */}
      <Section title="Identité" description="Informations affichées sur votre page publique.">
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
            <span className="text-sm text-muted-foreground">/r/</span>
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
      </Section>

      {/* === Contact === */}
      <Section title="Contact">
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
      </Section>

      {/* === Bannière promotionnelle === */}
      <Section
        title="Bannière promotionnelle"
        description="Affichée en haut de votre page publique pour annoncer une offre, un nouveau plat…"
      >
        <div className="space-y-2">
          <Label htmlFor="banner_text">Message (max 200 caractères)</Label>
          <Input
            id="banner_text"
            name="banner_text"
            maxLength={200}
            defaultValue={restaurant?.banner_text ?? ''}
            placeholder="Ex: -20% sur le couscous toute la semaine ! 🎉"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner_image">Image de bannière (optionnel)</Label>
          {restaurant?.banner_image_url && !removeBanner && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-2">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded">
                <Image src={restaurant.banner_image_url} alt="" fill className="object-cover" sizes="96px" />
              </div>
              <span className="flex-1 text-xs text-muted-foreground">Bannière actuelle</span>
              <button
                type="button"
                onClick={() => setRemoveBanner(true)}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Supprimer
              </button>
            </div>
          )}
          {removeBanner && (
            <p className="text-xs text-destructive">
              La bannière sera supprimée à l&apos;enregistrement.{' '}
              <button
                type="button"
                onClick={() => setRemoveBanner(false)}
                className="font-semibold underline"
              >
                Annuler
              </button>
            </p>
          )}
          <Input
            id="banner_image"
            name="banner_image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">
            jpg / png / webp — max 5 Mo. Format recommandé : 1200 × 300 px.
          </p>
        </div>
      </Section>

      {/* === Livraison === */}
      <Section title="Livraison" description="Définissez les frais et conditions de livraison.">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Frais (DA)</Label>
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
            <Label htmlFor="min_order">Min. (DA)</Label>
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
            <Label htmlFor="estimated_delivery_time">Délai initial (min)</Label>
            <Input
              id="estimated_delivery_time"
              name="estimated_delivery_time"
              type="number"
              min="5"
              max="240"
              defaultValue={restaurant?.estimated_delivery_time ?? 30}
            />
            <p className="text-xs text-muted-foreground">
              S&apos;ajuste automatiquement selon le temps réel de vos livraisons (moyenne des
              dernières commandes).
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="free_delivery_above">Livraison gratuite au-delà de (DA)</Label>
          <Input
            id="free_delivery_above"
            name="free_delivery_above"
            type="number"
            min="0"
            step="0.01"
            placeholder="Laisser vide pour désactiver"
            defaultValue={restaurant?.free_delivery_above ?? ''}
            aria-invalid={!!fieldErrors.free_delivery_above}
          />
          <p className="text-xs text-muted-foreground">
            Au-dessus de ce montant, les frais de livraison sont offerts au client.
          </p>
          {fieldErrors.free_delivery_above && (
            <p className="text-xs text-destructive">{fieldErrors.free_delivery_above}</p>
          )}
        </div>
      </Section>

      {/* === État === */}
      <Section title="État du restaurant">
        <div className="flex flex-wrap gap-6">
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
      </Section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          ✓ Paramètres enregistrés.
        </div>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Enregistrement…' : restaurant ? 'Enregistrer' : 'Créer mon restaurant'}
      </Button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}
