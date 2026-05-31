'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginState } from './actions';

const initial: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export function LoginClient() {
  const [state, formAction] = useActionState(loginAction, initial);
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === '1';
  const errorParam = searchParams.get('error');

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 animate-fade-in">
      <div className="space-y-2 text-center">
        <Link href="/" className="font-display text-2xl font-bold">
          Yelha<span className="text-primary">Delivery</span>
        </Link>
        <h1 className="font-display text-2xl font-bold">Espace restaurateur</h1>
        <p className="text-sm text-muted-foreground">
          Connectez-vous pour gérer votre restaurant.
        </p>
      </div>

      {justCreated && (
        <div
          role="status"
          className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          ✓ Votre compte a été créé. Connectez-vous pour accéder à votre dashboard.
        </div>
      )}
      {errorParam === 'compte_inactif' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Votre compte est désactivé. Contactez le support.
        </div>
      )}
      {errorParam === 'acces_refuse' && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Vous n&apos;avez pas accès à cet espace.
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            aria-invalid={!!state?.fieldErrors?.email}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
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

      <div className="space-y-3 border-t border-border pt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Inscrire mon restaurant
          </Link>
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/livreur/login" className="hover:text-foreground">
            Espace livreur
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-foreground">
            ← Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
