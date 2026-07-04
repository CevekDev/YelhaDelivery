'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/stores/cart';

export interface SiteNavLink {
  href: string;
  label: string;
}

export function SiteNav({
  brand,
  logoUrl,
  links,
  slug,
  orderHref,
  orderLabel = 'Commander',
}: {
  brand: string;
  logoUrl: string | null;
  links: SiteNavLink[];
  slug: string;
  orderHref: string;
  orderLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cartCount = useCart((s) => (s.restaurantSlug === slug ? s.lines.reduce((n, l) => n + l.quantity, 0) : 0));
  const hasCart = mounted && cartCount > 0;
  const ctaHref = hasCart ? `/r/${slug}/checkout` : orderHref;
  const ctaLabel = hasCart ? 'Panier' : orderLabel;

  // Fermer au Escape + verrouiller le scroll du body pendant que le drawer est ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--site-border)] bg-[var(--site-bg)]/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link href={links[0]?.href ?? orderHref} className="flex items-center gap-2.5">
          {logoUrl && (
            <span className="relative h-9 w-9 overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]">
              <Image src={logoUrl} alt="" fill className="object-cover" sizes="36px" />
            </span>
          )}
          <span className="font-[family-name:var(--font-site-heading)] text-lg font-bold tracking-tight text-[color:var(--site-text)]">
            {brand}
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[color:var(--site-muted)] transition-colors hover:text-[color:var(--site-text)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={ctaHref}
            className="relative inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--site-accent-fg)] transition-transform hover:scale-[1.03]"
          >
            <ShoppingBag className="h-4 w-4" />
            {ctaLabel}
            {hasCart && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--site-accent-fg)] px-1.5 text-[10px] font-black text-[color:var(--site-accent)]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--site-radius)] text-[color:var(--site-text)] md:hidden"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="site-mobile-drawer"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="site-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--site-radius)] px-3 py-3 text-base font-medium text-[color:var(--site-text)] hover:bg-[var(--site-surface)]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="relative mt-2 inline-flex items-center justify-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-3 text-base font-semibold text-[color:var(--site-accent-fg)]"
            >
              <ShoppingBag className="h-5 w-5" />
              {ctaLabel}
              {hasCart && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--site-accent-fg)] px-1.5 text-[10px] font-black text-[color:var(--site-accent)]">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
