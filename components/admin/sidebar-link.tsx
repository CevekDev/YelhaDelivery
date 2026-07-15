'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Users,
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
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/avis', label: 'Avis clients', icon: Star },
  { href: '/admin/promos', label: 'Codes promo', icon: Ticket },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
