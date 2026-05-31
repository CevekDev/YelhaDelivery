import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  marketing?: {
    eyebrow: string;
    headline: React.ReactNode;
    bullets: string[];
  };
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Layout commun pour toutes les pages de login / inscription.
 * Sur desktop : split avec marketing à gauche + form à droite (si marketing).
 * Sur mobile : juste le form, centré.
 */
export function AuthShell({ title, subtitle, marketing, children, footer }: Props) {
  const hasMarketing = !!marketing;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Accueil
          </Link>
        </div>
      </header>

      <div
        className={cn(
          'container py-10 md:py-16 lg:py-20',
          hasMarketing
            ? 'grid items-start gap-12 lg:grid-cols-2 lg:gap-20'
            : 'flex justify-center',
        )}
      >
        {marketing && (
          <aside className="hidden lg:block">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {marketing.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
              {marketing.headline}
            </h1>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              {marketing.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs text-success">
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-card md:p-8 animate-fade-in">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
