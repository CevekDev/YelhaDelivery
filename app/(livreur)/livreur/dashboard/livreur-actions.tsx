'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { livreurUpdateOrderAction } from './actions';
import type { OrderStatus } from '@/types/database';

export function LivreurActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [isPending, startTransition] = useTransition();

  if (status !== 'assigned' && status !== 'on_the_way') return null;

  const nextStatus: OrderStatus = status === 'assigned' ? 'on_the_way' : 'delivered';
  const label = status === 'assigned' ? 'Démarrer la livraison' : 'Marquer comme livrée';
  const confirmMsg =
    status === 'on_the_way' ? 'Confirmer la livraison (cash encaissé) ?' : undefined;

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          if (confirmMsg && !confirm(confirmMsg)) return;
          fd.set('order_id', orderId);
          fd.set('next_status', nextStatus);
          await livreurUpdateOrderAction(fd);
        })
      }
    >
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? 'Mise à jour…' : label}
      </Button>
    </form>
  );
}
