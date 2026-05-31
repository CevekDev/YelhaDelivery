'use client';

import { useTransition } from 'react';
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

  return (
    <div className="flex items-center gap-2">
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set('id', id);
            fd.set('is_active', String(isActive));
            await togglePromoAction(fd);
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
            await deletePromoAction(fd);
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
