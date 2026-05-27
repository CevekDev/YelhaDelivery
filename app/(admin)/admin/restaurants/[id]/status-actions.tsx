'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setRestaurantStatusAction } from '../actions';
import type { RestaurantStatus } from '@/types/database';

export function StatusActions({ id, current }: { id: string; current: RestaurantStatus }) {
  const [isPending, startTransition] = useTransition();

  const setStatus = (status: RestaurantStatus, confirmMsg?: string) =>
    startTransition(async () => {
      if (confirmMsg && !confirm(confirmMsg)) return;
      const fd = new FormData();
      fd.set('id', id);
      fd.set('status', status);
      await setRestaurantStatusAction(fd);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {current !== 'active' && (
        <Button onClick={() => setStatus('active')} disabled={isPending}>
          Activer
        </Button>
      )}
      {current !== 'suspended' && (
        <Button
          variant="destructive"
          onClick={() => setStatus('suspended', 'Suspendre ce restaurant ?')}
          disabled={isPending}
        >
          Suspendre
        </Button>
      )}
      {current !== 'pending' && (
        <Button variant="outline" onClick={() => setStatus('pending')} disabled={isPending}>
          Mettre en attente
        </Button>
      )}
    </div>
  );
}
