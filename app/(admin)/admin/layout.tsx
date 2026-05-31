import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { LayoutDashboard, LogOut, Shield, Store, Users } from 'lucide-react';
import { AdminSidebarLink } from '@/components/admin/sidebar-link';

const NAV = [
  { href: '/admin/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/admin/dashboard" className="font-display text-lg font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
              Super admin
            </p>
            <p className="text-xs text-muted-foreground">Accès global</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <AdminSidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
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
      <div className="flex flex-1 flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
