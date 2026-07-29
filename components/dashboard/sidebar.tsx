'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Bike,
  Settings,
  LogOut,
  Ticket,
  Clock,
  BarChart2,
  Star,
  Globe,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/site', label: 'Site web', icon: Globe },
  { href: '/dashboard/promos', label: 'Codes promo', icon: Ticket },
  { href: '/dashboard/horaires', label: 'Horaires', icon: Clock },
  { href: '/dashboard/livreurs', label: 'Livreurs', icon: Bike },
  { href: '/dashboard/analytics', label: 'Analytiques', icon: BarChart2 },
  { href: '/dashboard/avis', label: 'Avis clients', icon: Star },
  { href: '/dashboard/abonnement', label: 'Abonnement', icon: CreditCard },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar({ restaurantName }: { restaurantName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="font-display text-lg font-extrabold">
          Yelha<span className="text-primary">Delivery</span>
        </Link>
      </div>
      <div className="border-b border-border px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Restaurant
        </p>
        <p className="mt-1 truncate font-display font-bold">{restaurantName}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, 'exact' in item ? item.exact : false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className={cn('h-4 w-4', active && 'text-primary')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/signout" method="post" className="border-t border-border p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

// Mobile bottom nav — 4 raccourcis les plus utilisés + un bouton « Plus » qui
// ouvre un tiroir listant TOUTES les sections (sinon inaccessibles sur mobile).
const MOBILE_NAV = [
  { href: '/dashboard', label: 'Vue', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/promos', label: 'Promos', icon: Ticket },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme le tiroir à chaque changement de route.
  useEffect(() => setOpen(false), [pathname]);

  // Échap + verrouillage du scroll pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Une des sections « secondaires » est-elle active ? (surligne le bouton Plus)
  const moreActive =
    !MOBILE_NAV.some((i) => isActive(pathname, i.href, 'exact' in i ? i.exact : false)) &&
    pathname.startsWith('/dashboard');

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, 'exact' in item ? item.exact : false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {active && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />}
              <Icon className="h-5 w-5" />
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Plus de sections"
          aria-expanded={open}
          className={cn(
            'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors',
            moreActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {moreActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />}
          <Menu className="h-5 w-5" />
          <span className="truncate px-1">Plus</span>
        </button>
      </nav>

      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Toutes les sections"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <span className="font-display text-base font-bold">Toutes les sections</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2 p-4">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href, 'exact' in item ? item.exact : false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <form action="/api/auth/signout" method="post" className="border-t border-border p-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
