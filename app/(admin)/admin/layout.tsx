import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { LayoutDashboard, Store, Users, LogOut } from 'lucide-react';

const NAV = [
  { href: '/admin/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/admin/dashboard" className="font-display text-lg font-bold">
            Yelha<span className="text-primary">Delivery</span> · Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-input hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
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
      <div className="flex flex-1 flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
