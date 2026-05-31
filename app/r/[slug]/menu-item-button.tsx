'use client';

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
      <button
        type="button"
        onClick={() => add(slug, item)}
        disabled={disabled}
        aria-label={`Ajouter ${item.name}`}
        className="group/btn inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-card transition-all hover:scale-105 hover:bg-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-4 w-4 transition-transform group-hover/btn:rotate-90" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 shadow-card">
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity - 1)}
        aria-label="Diminuer"
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[20px] text-center text-sm font-bold tabular-nums">
        {line.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity + 1)}
        aria-label="Augmenter"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-dark"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
