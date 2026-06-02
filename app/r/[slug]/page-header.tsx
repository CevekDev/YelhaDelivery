'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '@/stores/cart';

export function PublicPageHeader({
  slug,
  restaurantName,
}: {
  slug: string;
  restaurantName: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lines = useCart((s) => s.lines);
  const cartSlug = useCart((s) => s.restaurantSlug);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 210);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const count =
    mounted && cartSlug === slug ? lines.reduce((n, l) => n + l.quantity, 0) : 0;

  const btnBase =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ';
  const btnDark = 'bg-black/30 text-white backdrop-blur-sm hover:bg-black/40';
  const btnLight = 'bg-[#F5F5F5] text-[#1A1A1A] hover:bg-gray-200';

  return (
    <header
      className={
        'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-4 transition-all duration-300 ' +
        (scrolled ? 'bg-white shadow-sm' : '')
      }
    >
      <Link href="/" aria-label="Retour" className={btnBase + (scrolled ? btnLight : btnDark)}>
        <ArrowLeft className="h-[18px] w-[18px]" />
      </Link>

      {scrolled && (
        <p className="min-w-0 flex-1 truncate px-3 text-center text-sm font-bold text-[#1A1A1A]">
          {restaurantName}
        </p>
      )}

      <Link
        href={`/r/${slug}/checkout`}
        aria-label="Panier"
        className={btnBase + (scrolled ? btnLight : btnDark) + ' relative'}
      >
        <ShoppingCart className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </header>
  );
}
