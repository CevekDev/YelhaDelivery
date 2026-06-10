'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { deletePostAction } from './actions';

export function PostRowActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    startTransition(async () => {
      const res = await deletePostAction(postId);
      if (res.ok) router.refresh();
      else setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/site/blog/${postId}/edit`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Modifier"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      {confirming ? (
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="rounded-lg bg-destructive px-2 py-1 text-xs font-semibold text-white"
        >
          {isPending ? '…' : 'Confirmer'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
