'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deletePromoAction, togglePromoAction } from './actions';

export function PromoRowActions({
  id,
  isActive,
  disabled,
}: {
  id: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set('id', id);
            fd.set('is_active', String(isActive));
            const res = await togglePromoAction(fd);
            setError(res.ok ? null : res.error ?? 'Action impossible');
          })
        }
      >
        <Button type="submit" size="sm" variant="outline" disabled={isPending || disabled}>
          {isActive ? 'Désactiver' : 'Réactiver'}
        </Button>
      </form>
      <form
        action={(fd) =>
          startTransition(async () => {
            if (!confirm('Supprimer ce code promo ?')) return;
            fd.set('id', id);
            const res = await deletePromoAction(fd);
            setError(res.ok ? null : res.error ?? 'Suppression impossible');
          })
        }
      >
        <button
          type="submit"
          disabled={isPending}
          aria-label="Supprimer"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
