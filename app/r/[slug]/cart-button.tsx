'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import type { Restaurant } from '@/types/database';

interface Props {
  slug: string;
  restaurant: Pick<Restaurant, 'delivery_fee' | 'free_delivery_above'>;
  canOrder: boolean;
}

export function CartButton({ slug, restaurant, canOrder }: Props) {
  const [mounted, setMounted] = useState(false);
  const lines = useCart((s) => s.lines);
  const cartSlug = useCart((s) => s.restaurantSlug);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const relevant = cartSlug === slug ? lines : [];
  const count = relevant.reduce((n, l) => n + l.quantity, 0);
  if (count === 0 || !canOrder) return null;

  const subtotal = relevant.reduce((s, l) => s + l.price * l.quantity, 0);
  const isFreeDelivery =
    restaurant.free_delivery_above != null && subtotal >= restaurant.free_delivery_above;
  const deliveryFee = isFreeDelivery ? 0 : Number(restaurant.delivery_fee);
  const total = subtotal + deliveryFee;

  // Combien manque-t-il pour la livraison gratuite ?
  const remainingForFree =
    restaurant.free_delivery_above != null && !isFreeDelivery
      ? restaurant.free_delivery_above - subtotal
      : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-4 md:border-t-0 md:bg-transparent md:px-0">
      <div className="mx-auto max-w-md md:px-4">
        {remainingForFree > 0 && (
          <div className="mb-2 rounded-lg bg-success/10 px-3 py-2 text-center text-xs text-success">
            🎁 Plus que <strong>{formatPrice(remainingForFree)}</strong> pour la livraison
            offerte
          </div>
        )}
        <Link
          href={`/r/${slug}/checkout`}
          className="flex w-full items-center justify-between rounded-xl bg-foreground px-5 py-4 text-background shadow-card-hover transition-transform hover:scale-[1.01]"
        >
          <span className="flex items-center gap-3">
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold text-foreground">
                {count}
              </span>
            </span>
            <span className="font-semibold">Voir le panier</span>
          </span>
          <span className="font-display text-lg font-bold tabular-nums">{formatPrice(total)}</span>
        </Link>
      </div>
    </div>
  );
}
