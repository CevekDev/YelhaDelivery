'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShoppingCart } from 'lucide-react';
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
  const remaining =
    restaurant.free_delivery_above != null && !isFreeDelivery
      ? restaurant.free_delivery_above - subtotal
      : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-in slide-in-from-bottom-2 duration-300 px-4 pb-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
      {remaining > 0 && (
        <div className="mb-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-center text-xs font-semibold text-green-700">
          🎁 Plus que{' '}
          <span className="font-black">{formatPrice(remaining)}</span> pour la
          livraison offerte
        </div>
      )}

      <Link
        href={`/r/${slug}/checkout`}
        className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 shadow-[0_8px_32px_rgba(255,92,26,0.40)] transition-all hover:bg-primary-dark active:scale-[0.985]"
      >
        {/* Left: cart icon + label */}
        <span className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ShoppingCart className="h-[18px] w-[18px] text-white" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-primary">
              {count}
            </span>
          </span>
          <span className="font-bold text-white">Voir le panier</span>
        </span>

        {/* Right: total + chevron */}
        <span className="flex items-center gap-1">
          <span className="font-display text-base font-black text-white tabular-nums">
            {formatPrice(total)}
          </span>
          <ChevronRight className="h-4 w-4 text-white/70" />
        </span>
      </Link>
    </div>
  );
}
