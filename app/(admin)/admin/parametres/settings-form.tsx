'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { changeAdminUsernameAction, changeAdminPasswordAction } from './actions';

export function AdminSettingsForms({ currentUsername }: { currentUsername: string }) {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <UsernameForm currentUsername={currentUsername} onDone={() => router.refresh()} />
      <PasswordForm />
    </div>
  );
}

function Feedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (error)
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {error}
      </p>
    );
  if (success)
    return (
      <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
        ✓ {success}
      </p>
    );
  return null;
}

function UsernameForm({
  currentUsername,
  onDone,
}: {
  currentUsername: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AtSign className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold">Identifiant</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Votre identifiant de connexion au panel. Actuel :{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">{currentUsername}</code>
      </p>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            setSuccess(null);
            const res = await changeAdminUsernameAction(fd);
            if (res.ok) {
              setSuccess(res.success ?? 'Identifiant mis à jour.');
              onDone();
            } else {
              setError(res.error ?? 'Erreur.');
            }
          })
        }
        className="mt-4 space-y-3"
      >
        <div className="space-y-2">
          <Label htmlFor="new-username">Nouvel identifiant</Label>
          <Input
            id="new-username"
            name="username"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="mehdi"
          />
          <p className="text-[11px] text-muted-foreground">
            Lettres minuscules, chiffres et « _ » · 3 à 32 caractères.
          </p>
        </div>
        <Feedback error={error} success={success} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Changer l’identifiant'}
        </Button>
      </form>
    </div>
  );
}

function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card md:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold">Mot de passe</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Choisissez un mot de passe fort — ce panel donne accès à toutes les données de la
        plateforme.
      </p>
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            setSuccess(null);
            const res = await changeAdminPasswordAction(fd);
            if (res.ok) {
              setSuccess(res.success ?? 'Mot de passe mis à jour.');
              (document.getElementById('admin-password-form') as HTMLFormElement | null)?.reset();
            } else {
              setError(res.error ?? 'Erreur.');
            }
          })
        }
        id="admin-password-form"
        className="mt-4 space-y-3"
      >
        <div className="space-y-2">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmer</Label>
          <Input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Feedback error={error} success={success} />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
        </Button>
      </form>
    </div>
  );
}
