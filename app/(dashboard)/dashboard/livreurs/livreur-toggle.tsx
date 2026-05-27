'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toggleLivreurAction } from './actions';

export function LivreurToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          fd.set('id', id);
          fd.set('is_active', String(isActive));
          await toggleLivreurAction(fd);
        })
      }
    >
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isActive ? 'Désactiver' : 'Activer'}
      </Button>
    </form>
  );
}
