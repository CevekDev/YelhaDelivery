'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createLivreurAction } from '../actions';

export function LivreurForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
          const res = await createLivreurAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            router.push('/dashboard/livreurs');
            router.refresh();
          }
        })
      }
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">Nom complet *</Label>
        <Input id="full_name" name="full_name" required maxLength={120} aria-invalid={!!fieldErrors.full_name} />
        {fieldErrors.full_name && <p className="text-xs text-destructive">{fieldErrors.full_name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Identifiant de connexion *</Label>
        <Input
          id="username"
          name="username"
          required
          pattern="[a-z0-9_]{3,32}"
          autoComplete="off"
          placeholder="ex: ahmed_22"
          aria-invalid={!!fieldErrors.username}
        />
        <p className="text-xs text-muted-foreground">Lettres minuscules, chiffres et _ uniquement.</p>
        {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe *</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone (optionnel)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          pattern="0[5-7][0-9]{8}"
          placeholder="0555123456"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création…' : 'Créer le livreur'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
