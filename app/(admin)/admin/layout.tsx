import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { LogOut, Shield } from 'lucide-react';
import { AdminNav, AdminMobileBar } from '@/components/admin/sidebar-link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin');

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-line bg-ink text-ink-foreground md:flex">
        <div className="flex h-16 items-center border-b border-ink-line px-6">
          <Link href="/admin/dashboard" className="font-display text-lg font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
        </div>
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-ink-light px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/20 text-destructive">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
              Super admin
            </p>
            <p className="text-xs text-ink-muted">Accès global</p>
          </div>
        </div>
        <AdminNav />
        <form action="/api/auth/signout" method="post" className="border-t border-ink-line p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-light hover:text-ink-foreground"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
