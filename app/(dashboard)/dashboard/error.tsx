'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] render error:', error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-xl font-bold">Oups, une erreur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n’a pas pu se charger. Réessayez dans un instant.
        </p>
        {error.digest && (
          <p className="mt-3 inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            <RotateCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
