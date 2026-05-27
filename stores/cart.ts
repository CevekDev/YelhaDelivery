'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartLine {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  restaurantSlug: string | null;
  lines: CartLine[];
  add: (slug: string, line: Omit<CartLine, 'quantity'>) => void;
  setQty: (menu_item_id: string, qty: number) => void;
  remove: (menu_item_id: string) => void;
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
        // Si l'utilisateur change de restaurant, on vide le panier précédent.
        if (state.restaurantSlug && state.restaurantSlug !== slug) {
          set({ restaurantSlug: slug, lines: [{ ...line, quantity: 1 }] });
          return;
        }
        const idx = state.lines.findIndex((l) => l.menu_item_id === line.menu_item_id);
        if (idx >= 0) {
          const next = [...state.lines];
          next[idx] = { ...next[idx]!, quantity: Math.min(99, next[idx]!.quantity + 1) };
          set({ restaurantSlug: slug, lines: next });
        } else {
          set({ restaurantSlug: slug, lines: [...state.lines, { ...line, quantity: 1 }] });
        }
      },
      setQty(menu_item_id, qty) {
        const next = qty <= 0
          ? get().lines.filter((l) => l.menu_item_id !== menu_item_id)
          : get().lines.map((l) =>
              l.menu_item_id === menu_item_id ? { ...l, quantity: Math.min(99, qty) } : l,
            );
        set({ lines: next });
      },
      remove(menu_item_id) {
        set({ lines: get().lines.filter((l) => l.menu_item_id !== menu_item_id) });
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
