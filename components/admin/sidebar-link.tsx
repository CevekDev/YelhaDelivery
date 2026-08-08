'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// La navigation (icônes incluses) vit DANS le composant client : les composants
// d'icônes Lucide ne doivent jamais être passés en prop depuis un Server
// Component (erreur « Functions cannot be passed directly to Client Components »).
const NAV = [
  { href: '/admin/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/analytiques', label: 'Analytiques', icon: BarChart3 },
  { href: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/avis', label: 'Avis clients', icon: Star },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

/** Navigation latérale — desktop uniquement (rendue dans l'aside). */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-card'
                : 'text-ink-muted hover:bg-ink-light hover:text-ink-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Barre de navigation mobile — header sticky + drawer plein écran.
 * Le panel admin n'était accessible qu'au-dessus de md ; sur mobile il n'y
 * avait plus ni navigation, ni logo, ni déconnexion.
 */
export function AdminMobileBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme le drawer à chaque changement de route.
  useEffect(() => setOpen(false), [pathname]);

  // Échap + verrouillage du scroll du body pendant l'ouverture.
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      <Link href="/admin/dashboard" className="font-display text-lg font-extrabold">
        Yelha<span className="text-primary">Delivery</span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        aria-controls="admin-mobile-drawer"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation admin"
            className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-card shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                  Super admin
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <form action="/api/auth/signout" method="post" className="border-t border-border p-3">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </form>
          </div>
        </>
      )}
    </header>
  );
}
