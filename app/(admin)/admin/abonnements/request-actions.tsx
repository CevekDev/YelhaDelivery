'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  approveSubscriptionRequestAction,
  rejectSubscriptionRequestAction,
} from './actions';

export function SubscriptionRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function approve() {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set('id', id);
      const res = await approveSubscriptionRequestAction(fd);
      if (!res.ok) setError(res.error ?? 'Erreur');
      else router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set('id', id);
      fd.set('note', note);
      const res = await rejectSubscriptionRequestAction(fd);
      if (!res.ok) setError(res.error ?? 'Erreur');
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={approve} disabled={isPending}>
            <Check className="h-4 w-4" />
            {isPending ? '…' : 'Valider'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting(true)}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            Refuser
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motif du refus (communiqué au restaurateur)…"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="destructive" onClick={reject} disabled={isPending}>
              {isPending ? '…' : 'Confirmer le refus'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRejecting(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
