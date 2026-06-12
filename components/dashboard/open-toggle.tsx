'use client';

import { useState, useTransition } from 'react';
import { toggleOpenAction } from '@/app/(dashboard)/dashboard/parametres/actions';
import { cn } from '@/lib/utils';

export function OpenToggle({ isOpen }: { isOpen: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set('is_open', String(isOpen));
            const res = await toggleOpenAction(fd);
            setError(res.ok ? null : res.error ?? 'Action impossible');
          })
        }
        className="inline-flex"
      >
        <button
          type="submit"
          disabled={isPending}
          role="switch"
          aria-checked={isOpen}
          aria-label={isOpen ? 'Fermer le restaurant' : 'Ouvrir le restaurant'}
          className={cn(
            'group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
            isOpen
              ? 'border-success/30 bg-success'
              : 'border-border bg-muted hover:bg-border',
            isPending && 'opacity-60',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform',
              isOpen ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
