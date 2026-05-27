'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { deleteMenuItemAction, toggleMenuItemAvailabilityAction } from './actions';
import type { MenuItem } from '@/types/database';

export function ItemRowActions({ item }: { item: MenuItem }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <form
        action={(fd) =>
          startTransition(async () => {
            fd.set('id', item.id);
            fd.set('is_available', String(item.is_available));
            await toggleMenuItemAvailabilityAction(fd);
          })
        }
      >
        <button
          type="submit"
          disabled={isPending}
          aria-label={item.is_available ? 'Rendre indisponible' : 'Rendre disponible'}
          className="rounded-md p-2 text-muted-foreground hover:bg-input hover:text-foreground"
        >
          {item.is_available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </form>

      <Link
        href={`/dashboard/menu/${item.id}/edit`}
        aria-label="Modifier"
        className="rounded-md p-2 text-muted-foreground hover:bg-input hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      <form
        action={(fd) =>
          startTransition(async () => {
            if (!confirm(`Supprimer « ${item.name} » ?`)) return;
            fd.set('id', item.id);
            await deleteMenuItemAction(fd);
          })
        }
      >
        <button
          type="submit"
          disabled={isPending}
          aria-label="Supprimer"
          className="rounded-md p-2 text-muted-foreground hover:bg-input hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
