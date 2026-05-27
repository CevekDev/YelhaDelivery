'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateSlug } from '@/lib/utils';
import { createRestaurateurAccountAction } from '../actions';

export function CreateRestaurateurForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
          const res = await createRestaurateurAccountAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            router.push('/admin/restaurants');
          }
        })
      }
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="restaurant_name">Nom du restaurant *</Label>
        <Input
          id="restaurant_name"
          name="restaurant_name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(generateSlug(e.target.value));
          }}
          aria-invalid={!!fieldErrors.restaurant_name}
        />
        {fieldErrors.restaurant_name && (
          <p className="text-xs text-destructive">{fieldErrors.restaurant_name}</p>
        )}
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
        <Label htmlFor="owner_full_name">Nom du propriétaire *</Label>
        <Input
          id="owner_full_name"
          name="owner_full_name"
          required
          maxLength={120}
          aria-invalid={!!fieldErrors.owner_full_name}
        />
        {fieldErrors.owner_full_name && (
          <p className="text-xs text-destructive">{fieldErrors.owner_full_name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_email">Email du propriétaire *</Label>
        <Input
          id="owner_email"
          name="owner_email"
          type="email"
          required
          autoComplete="off"
          aria-invalid={!!fieldErrors.owner_email}
        />
        {fieldErrors.owner_email && (
          <p className="text-xs text-destructive">{fieldErrors.owner_email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_password">Mot de passe temporaire *</Label>
        <Input
          id="owner_password"
          name="owner_password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          aria-invalid={!!fieldErrors.owner_password}
        />
        <p className="text-xs text-muted-foreground">
          Le restaurateur pourra le changer ensuite. Min 8 caractères.
        </p>
        {fieldErrors.owner_password && (
          <p className="text-xs text-destructive">{fieldErrors.owner_password}</p>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création…' : 'Créer le compte'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
