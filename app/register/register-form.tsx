'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateSlug } from '@/lib/utils';
import { registerRestaurateurAction, type RegisterState } from './actions';

const initial: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Création de votre compte…' : 'Créer mon compte gratuitement'}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerRestaurateurAction, initial);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer mon compte</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          {/* Restaurant */}
          <div className="space-y-2">
            <Label htmlFor="restaurant_name">Nom du restaurant *</Label>
            <Input
              id="restaurant_name"
              name="restaurant_name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(generateSlug(e.target.value));
              }}
              autoComplete="organization"
              aria-invalid={!!state?.fieldErrors?.restaurant_name}
            />
            {state?.fieldErrors?.restaurant_name && (
              <p className="text-xs text-destructive">{state.fieldErrors.restaurant_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL publique *</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">delivery.yelha.net/r/</span>
              <Input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={80}
                placeholder="mon-restaurant"
                aria-invalid={!!state?.fieldErrors?.slug}
              />
            </div>
            {state?.fieldErrors?.slug && (
              <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vos informations
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_full_name">Votre nom complet *</Label>
            <Input
              id="owner_full_name"
              name="owner_full_name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              aria-invalid={!!state?.fieldErrors?.owner_full_name}
            />
            {state?.fieldErrors?.owner_full_name && (
              <p className="text-xs text-destructive">{state.fieldErrors.owner_full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_email">Email *</Label>
            <Input
              id="owner_email"
              name="owner_email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={!!state?.fieldErrors?.owner_email}
            />
            {state?.fieldErrors?.owner_email && (
              <p className="text-xs text-destructive">{state.fieldErrors.owner_email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_phone">Téléphone (optionnel)</Label>
            <Input
              id="owner_phone"
              name="owner_phone"
              type="tel"
              inputMode="numeric"
              pattern="0[5-7][0-9]{8}"
              placeholder="0555123456"
              autoComplete="tel"
              aria-invalid={!!state?.fieldErrors?.owner_phone}
            />
            {state?.fieldErrors?.owner_phone && (
              <p className="text-xs text-destructive">{state.fieldErrors.owner_phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              aria-invalid={!!state?.fieldErrors?.password}
            />
            <p className="text-xs text-muted-foreground">Min 8 caractères, au moins 1 lettre et 1 chiffre.</p>
            {state?.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirm">Confirmer le mot de passe *</Label>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              aria-invalid={!!state?.fieldErrors?.password_confirm}
            />
            {state?.fieldErrors?.password_confirm && (
              <p className="text-xs text-destructive">{state.fieldErrors.password_confirm}</p>
            )}
          </div>

          <label className="flex items-start gap-2 pt-2 text-sm">
            <input
              type="checkbox"
              name="accept_terms"
              required
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-muted-foreground">
              J&apos;accepte les{' '}
              <Link href="/cgu" className="text-primary hover:underline">
                conditions d&apos;utilisation
              </Link>{' '}
              et la politique de confidentialité.
            </span>
          </label>
          {state?.fieldErrors?.accept_terms && (
            <p className="text-xs text-destructive">{state.fieldErrors.accept_terms}</p>
          )}

          {state?.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <SubmitButton />

          <p className="text-center text-xs text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
