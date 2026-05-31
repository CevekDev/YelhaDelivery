'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Bike, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/dashboard/livreurs', label: 'Livreurs', icon: Bike },
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
        <Link href="/dashboard" className="font-display text-lg font-bold">
          Yelha <span className="text-primary">Delivery</span>
        </Link>
      </div>
      <div className="border-b border-border px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Restaurant</p>
        <p className="mt-1 truncate font-medium">{restaurantName}</p>
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
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary-light'
                  : 'text-muted-foreground hover:bg-input hover:text-foreground',
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
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-input hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href, 'exact' in item ? item.exact : false);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 text-[10px]',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate px-1">{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
