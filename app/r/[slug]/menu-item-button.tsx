'use client';

import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '@/stores/cart';

interface Props {
  slug: string;
  item: { menu_item_id: string; name: string; price: number };
  disabled?: boolean;
}

export function MenuItemButton({ slug, item, disabled }: Props) {
  const line = useCart((s) => s.lines.find((l) => l.menu_item_id === item.menu_item_id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  if (!line) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => add(slug, item)}
        disabled={disabled}
        aria-label={`Ajouter ${item.name}`}
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity - 1)}
        aria-label="Diminuer"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card hover:bg-input"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.5rem] text-center font-semibold tabular-nums">
        {line.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity + 1)}
        aria-label="Augmenter"
        className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary-dark"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
