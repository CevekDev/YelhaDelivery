'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';

interface Props {
  slug: string;
  deliveryFee: number;
  canOrder: boolean;
}

export function CartButton({ slug, deliveryFee, canOrder }: Props) {
  const [mounted, setMounted] = useState(false);
  const lines = useCart((s) => s.lines);
  const cartSlug = useCart((s) => s.restaurantSlug);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const relevant = cartSlug === slug ? lines : [];
  const count = relevant.reduce((n, l) => n + l.quantity, 0);
  if (count === 0 || !canOrder) return null;

  const subtotal = relevant.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <Link
        href={`/r/${slug}/checkout`}
        className="flex w-full max-w-md items-center justify-between rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg hover:bg-primary-dark"
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">{count} article{count > 1 ? 's' : ''}</span>
        </span>
        <span className="font-display font-bold">
          {formatPrice(subtotal + deliveryFee)}
        </span>
      </Link>
    </div>
  );
}
