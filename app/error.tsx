'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Désolé pour la gêne. Vous pouvez réessayer ou revenir à l’accueil.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">Code : {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="outline">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </main>
  );
}
