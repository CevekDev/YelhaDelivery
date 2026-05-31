'use client';

import { useTransition } from 'react';
import { toggleOpenAction } from '@/app/(dashboard)/dashboard/parametres/actions';
import { cn } from '@/lib/utils';

export function OpenToggle({ isOpen }: { isOpen: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          fd.set('is_open', String(isOpen));
          await toggleOpenAction(fd);
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
  );
}
