'use client';

import { useState, useTransition } from 'react';
import { toggleAcceptOrdersAction } from '@/app/(dashboard)/dashboard/parametres/actions';
import { cn } from '@/lib/utils';

/**
 * Switch instantané « Livraison active / en pause » (accept_orders).
 * Placé dans le header du dashboard → accessible depuis n'importe quelle page,
 * à n'importe quel moment. Met en pause la prise de commandes sans fermer le
 * restaurant (le site public reste en ligne).
 */
export function DeliveryToggle({ accept }: { accept: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set('accept_orders', String(accept));
            const res = await toggleAcceptOrdersAction(fd);
            setError(res.ok ? null : res.error ?? 'Action impossible');
          })
        }
        className="inline-flex"
      >
        <button
          type="submit"
          disabled={isPending}
          role="switch"
          aria-checked={accept}
          aria-label={accept ? 'Mettre la livraison en pause' : 'Activer la livraison'}
          className={cn(
            'group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
            accept ? 'border-success/30 bg-success' : 'border-border bg-muted hover:bg-border',
            isPending && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform',
              accept ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
