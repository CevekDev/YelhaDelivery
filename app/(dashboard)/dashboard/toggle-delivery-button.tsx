'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bike } from 'lucide-react';
import { toggleAcceptOrdersAction } from './parametres/actions';

/**
 * Bouton « Livraison active / en pause » (accept_orders) — variante page
 * d'accueil du dashboard. Met en pause la prise de commandes sans fermer le
 * restaurant.
 */
export function ToggleDeliveryButton({ accept }: { accept: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('accept_orders', String(accept));
      const res = await toggleAcceptOrdersAction(fd);
      if (!res.ok) {
        setError(res.error ?? 'Action impossible');
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ' +
          (accept
            ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
            : 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20')
        }
      >
        <Bike className="h-4 w-4" />
        {isPending ? '…' : accept ? 'Livraison active' : 'Livraison en pause'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
