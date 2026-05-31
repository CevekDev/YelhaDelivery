import { Suspense } from 'react';
import { LoginClient } from './login-client';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        }
      >
        <LoginClient />
      </Suspense>
    </main>
  );
}
