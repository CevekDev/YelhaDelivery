'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartLine {
  /** Clé unique : `${menu_item_id}|${variant_id ?? ''}` */
  cart_key: string;
  menu_item_id: string;
  variant_id: string | null;
  variant_name: string | null;
  name: string;
  price: number;
  quantity: number;
}

export function makeCartKey(menu_item_id: string, variant_id?: string | null): string {
  return `${menu_item_id}|${variant_id ?? ''}`;
}

interface CartState {
  restaurantSlug: string | null;
  lines: CartLine[];
  add: (slug: string, line: Omit<CartLine, 'quantity' | 'cart_key'>) => void;
  setQty: (cart_key: string, qty: number) => void;
  remove: (cart_key: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantSlug: null,
      lines: [],

      add(slug, line) {
        const state = get();
        const key = makeCartKey(line.menu_item_id, line.variant_id);
        const newLine: CartLine = { ...line, cart_key: key, quantity: 1 };

        if (state.restaurantSlug && state.restaurantSlug !== slug) {
          set({ restaurantSlug: slug, lines: [newLine] });
          return;
        }

        const idx = state.lines.findIndex((l) => l.cart_key === key);
        if (idx >= 0) {
          const next = [...state.lines];
          next[idx] = { ...next[idx]!, quantity: Math.min(99, next[idx]!.quantity + 1) };
          set({ restaurantSlug: slug, lines: next });
        } else {
          set({ restaurantSlug: slug, lines: [...state.lines, newLine] });
        }
      },

      setQty(cart_key, qty) {
        const next =
          qty <= 0
            ? get().lines.filter((l) => l.cart_key !== cart_key)
            : get().lines.map((l) =>
                l.cart_key === cart_key ? { ...l, quantity: Math.min(99, qty) } : l,
              );
        set({ lines: next });
      },

      remove(cart_key) {
        set({ lines: get().lines.filter((l) => l.cart_key !== cart_key) });
      },

      clear() {
        set({ restaurantSlug: null, lines: [] });
      },

      count() {
        return get().lines.reduce((n, l) => n + l.quantity, 0);
      },

      subtotal() {
        return get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
      },
    }),
    {
      name: 'yelha-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ restaurantSlug: s.restaurantSlug, lines: s.lines }),
    },
  ),
);
