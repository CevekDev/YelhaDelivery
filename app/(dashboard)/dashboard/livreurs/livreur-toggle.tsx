'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toggleLivreurAction } from './actions';

export function LivreurToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="inline-flex items-center gap-2">
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
            const res = await toggleLivreurAction(fd);
            setError(res.ok ? null : res.error ?? 'Action impossible');
          })
        }
      >
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {isActive ? 'Désactiver' : 'Activer'}
        </Button>
      </form>
    </div>
  );
}
