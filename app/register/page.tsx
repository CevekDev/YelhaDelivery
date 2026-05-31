import Link from 'next/link';
import { RegisterForm } from './register-form';

export const metadata = {
  title: 'Créer mon compte restaurateur',
  description:
    'Inscrivez votre restaurant sur YelhaDms en 2 minutes. Gratuit. Paiement cash à la livraison.',
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold">
            Yelha<span className="text-primary">Dms</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Déjà inscrit ? <span className="font-semibold text-primary-light">Se connecter</span>
          </Link>
        </div>
      </header>

      <div className="container grid items-start gap-10 py-10 md:grid-cols-2 md:py-16">
        {/* Pitch à gauche (desktop) */}
        <aside className="hidden md:block">
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
            Lancez votre restaurant sur{' '}
            <span className="text-primary">YelhaDms</span> en 2 minutes
          </h1>
          <p className="mt-4 text-muted-foreground">
            Créez votre compte, configurez votre menu, ajoutez vos livreurs et commencez à recevoir
            des commandes en ligne.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              'Menu en ligne illimité (photos, prix, catégories)',
              'Commandes en temps réel sur votre dashboard',
              'Vos propres livreurs intégrés',
              'Paiement cash à la livraison — aucune commission',
              'Gratuit, sans engagement',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
            <p>
              ℹ️ <strong className="text-foreground">Modération</strong> : votre compte est créé
              immédiatement, mais votre page publique est activée après validation par notre
              équipe (généralement sous 24 h).
            </p>
          </div>
        </aside>

        {/* Formulaire */}
        <RegisterForm />
      </div>
    </main>
  );
}
