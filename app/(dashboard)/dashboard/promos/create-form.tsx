'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createPromoAction } from './actions';

export function CreatePromoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [type, setType] = useState<'percent' | 'fixed_amount'>('percent');

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(false);
          setFieldErrors({});
          const res = await createPromoAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            setSuccess(true);
            (document.getElementById('promo-form') as HTMLFormElement)?.reset();
            router.refresh();
          }
        })
      }
      id="promo-form"
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            name="code"
            required
            maxLength={30}
            placeholder="BIENVENUE20"
            className="font-mono uppercase"
            style={{ textTransform: 'uppercase' }}
            aria-invalid={!!fieldErrors.code}
          />
          {fieldErrors.code && <p className="text-xs text-destructive">{fieldErrors.code}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_type">Type de réduction *</Label>
          <select
            id="discount_type"
            name="discount_type"
            value={type}
            onChange={(e) => setType(e.target.value as 'percent' | 'fixed_amount')}
            className="flex h-11 w-full rounded-md border border-border bg-input px-3 text-sm"
          >
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed_amount">Montant fixe (DA)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="discount_value">
            Valeur * {type === 'percent' ? '(%)' : '(DA)'}
          </Label>
          <Input
            id="discount_value"
            name="discount_value"
            type="number"
            step={type === 'percent' ? '1' : '0.01'}
            min="0"
            max={type === 'percent' ? '100' : undefined}
            required
            placeholder={type === 'percent' ? '20' : '500'}
            aria-invalid={!!fieldErrors.discount_value}
          />
          {fieldErrors.discount_value && (
            <p className="text-xs text-destructive">{fieldErrors.discount_value}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_order">Commande min. (DA)</Label>
          <Input id="min_order" name="min_order" type="number" min="0" step="0.01" defaultValue={0} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_uses">Usages max (vide = illimité)</Label>
          <Input id="max_uses" name="max_uses" type="number" min="1" placeholder="Ex: 100" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires_at">Expire le (optionnel)</Label>
        <Input id="expires_at" name="expires_at" type="date" />
      </div>

      <input type="hidden" name="is_active" value="true" />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          ✓ Code promo créé.
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Création…' : 'Créer le code'}
      </Button>
    </form>
  );
}
