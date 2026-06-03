'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power } from 'lucide-react';
import { toggleOpenAction } from './parametres/actions';

export function ToggleOpenButton({ isOpen }: { isOpen: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('is_open', String(isOpen));
      await toggleOpenAction(fd);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={
        'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ' +
        (isOpen
          ? 'border-success/30 bg-success/10 text-success hover:bg-success/20'
          : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20')
      }
    >
      <Power className="h-4 w-4" />
      {isPending ? '…' : isOpen ? 'Ouvert' : 'Fermé'}
    </button>
  );
}
