import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

/**
 * En-tête réutilisable pour toutes les pages internes (dashboard / admin / livreur).
 */
export function PageHeader({ title, description, actions, eyebrow, className }: Props) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Carte avec coins arrondis + ombre douce. À utiliser pour grouper du contenu. */
export function PanelCard({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-background shadow-card',
        padded && 'p-5 md:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** En-tête de carte avec titre + (option) actions à droite. */
export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6',
        className,
      )}
    >
      <div>
        <h3 className="font-display text-base font-bold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
