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
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 shadow-sm transition-all hover:bg-gray-900 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border-2 border-gray-900 bg-white p-0.5">
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity - 1)}
        aria-label="Diminuer"
        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[20px] text-center text-sm font-bold tabular-nums text-gray-900">
        {line.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQty(item.menu_item_id, line.quantity + 1)}
        aria-label="Augmenter"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
