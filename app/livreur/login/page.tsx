'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { livreurLoginAction, type LivreurLoginState } from './actions';

const initial: LivreurLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export default function LivreurLoginPage() {
  const [state, formAction] = useActionState(livreurLoginAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 animate-fade-in">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-display text-2xl font-bold">
            Yelha <span className="text-primary">Delivery</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Espace livreur</h1>
        </div>

        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">Identifiant</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              aria-invalid={!!state?.fieldErrors?.username}
            />
            {state?.fieldErrors?.username && (
              <p className="text-xs text-destructive">{state.fieldErrors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!state?.fieldErrors?.password}
            />
            {state?.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>

          {state?.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Retour à l’accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
