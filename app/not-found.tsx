import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Cette page n’existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </main>
  );
}
