'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ShoppingBag } from 'lucide-react';

export interface SiteNavLink {
  href: string;
  label: string;
}

export function SiteNav({
  brand,
  logoUrl,
  links,
  orderHref,
  orderLabel = 'Commander',
}: {
  brand: string;
  logoUrl: string | null;
  links: SiteNavLink[];
  orderHref: string;
  orderLabel?: string;
}) {
  const [open, setOpen] = useState(false);

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
            href={orderHref}
            className="inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--site-accent-fg)] transition-transform hover:scale-[1.03]"
          >
            <ShoppingBag className="h-4 w-4" />
            {orderLabel}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--site-radius)] text-[color:var(--site-text)] md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-[var(--site-border)] bg-[var(--site-bg)] px-4 py-4 md:hidden">
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
              href={orderHref}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-3 text-base font-semibold text-[color:var(--site-accent-fg)]"
            >
              <ShoppingBag className="h-5 w-5" />
              {orderLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
