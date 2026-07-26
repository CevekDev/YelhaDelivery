'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setRestaurantStatusAction } from '../actions';
import type { RestaurantStatus } from '@/types/database';

export function StatusActions({ id, current }: { id: string; current: RestaurantStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setStatus = (status: RestaurantStatus, confirmMsg?: string) =>
    startTransition(async () => {
      if (confirmMsg && !confirm(confirmMsg)) return;
      const fd = new FormData();
      fd.set('id', id);
      fd.set('status', status);
      const res = await setRestaurantStatusAction(fd);
      if (res.ok) {
        setError(null);
        router.refresh(); // reflète le nouveau statut dans les boutons
      } else {
        setError(res.error ?? 'Action impossible');
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="w-full text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
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
