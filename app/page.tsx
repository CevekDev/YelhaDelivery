import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bike, Clock, ShieldCheck, Smartphone, Store, Utensils } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Top nav — sticky, clean white */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-extrabold">
            Yelha<span className="text-primary">Delivery</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Inscrire mon restaurant</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero — split layout avec gros mock-up à droite */}
      <section className="relative overflow-hidden">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-24 lg:py-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Plateforme pensée pour l&apos;Algérie
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-6xl">
              La livraison à <span className="text-primary">votre image.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Votre menu en ligne, vos commandes en temps réel et vos livreurs — tout sur une seule
              plateforme. Paiement cash à la livraison, aucune commission.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="text-base">
                <Link href="/register">
                  Inscrire mon restaurant <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="/r/el-bahia-alger">Voir un menu démo</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Gratuit</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-success" /> 2 min pour s&apos;inscrire</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Sans engagement</span>
            </div>
          </div>

          {/* Visual side — stack of food cards en illustration */}
          <div className="relative hidden md:block">
            <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { title: 'Couscous royal', price: '1 200 DA', emoji: '🍲', delay: '0s' },
                { title: 'Tajine zitoune', price: '950 DA', emoji: '🥘', delay: '0.05s' },
                { title: 'Chorba frik', price: '350 DA', emoji: '🍜', delay: '0.1s' },
                { title: 'Bourek viande', price: '250 DA', emoji: '🌯', delay: '0.15s' },
              ].map((d, i) => (
                <div
                  key={d.title}
                  className={
                    'rounded-xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-1 hover:shadow-card-hover ' +
                    (i % 2 === 1 ? 'mt-8' : '')
                  }
                  style={{ animation: `fade-in 0.4s ease-out ${d.delay} both` }}
                >
                  <div className="flex h-24 items-center justify-center rounded-lg bg-muted text-4xl">
                    {d.emoji}
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold leading-tight">{d.title}</p>
                    <p className="text-sm text-muted-foreground">{d.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-border bg-foreground py-6 text-background">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
            Plateforme active 24/7
          </span>
          <span className="hidden text-background/30 md:inline">·</span>
          <span className="opacity-90">
            <strong className="text-primary">0%</strong> de commission
          </span>
          <span className="hidden text-background/30 md:inline">·</span>
          <span className="opacity-90">Cash à la livraison</span>
          <span className="hidden text-background/30 md:inline">·</span>
          <span className="opacity-90">Données hébergées en Europe 🇪🇺</span>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">
            Tout ce qu&apos;il faut. <span className="text-primary">Rien de superflu.</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Conçu pour les restaurants qui veulent reprendre le contrôle de leur livraison.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: 'Menu en ligne illimité',
              desc: 'Plats, photos, catégories, prix en DA. Modifications instantanées.',
            },
            {
              icon: Smartphone,
              title: 'Commandes en temps réel',
              desc: 'Notification sonore à chaque nouvelle commande. Mobile-first.',
            },
            {
              icon: Bike,
              title: 'Vos livreurs intégrés',
              desc: 'Créez les comptes de vos livreurs. Ils gèrent leurs tournées en direct.',
            },
            {
              icon: Utensils,
              title: 'Cash à la livraison',
              desc: 'Aucune intégration paiement compliquée. Vos livreurs encaissent.',
            },
            {
              icon: Clock,
              title: 'Suivi client temps réel',
              desc: 'Vos clients suivent leur commande sans installer d&apos;application.',
            },
            {
              icon: ShieldCheck,
              title: 'Sécurité & RGPD',
              desc: 'Données hébergées en Europe. Protection des accès par rôle.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">
              Lancer son restaurant en <span className="text-primary">3 étapes</span>
            </h2>
          </div>
          <ol className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { n: 1, t: 'Créez votre compte', d: 'Inscription gratuite en 2 minutes.' },
              { n: 2, t: 'Construisez votre menu', d: 'Ajoutez plats, photos et catégories.' },
              { n: 3, t: 'Recevez vos commandes', d: 'Activez votre restaurant, partagez le lien.' },
            ].map((s) => (
              <li
                key={s.n}
                className="relative rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <span className="absolute -top-4 left-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="container py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center text-primary-foreground shadow-card-hover">
          <h2 className="font-display text-3xl font-extrabold md:text-4xl">
            Prêt à digitaliser votre livraison ?
          </h2>
          <p className="mt-3 text-base opacity-90">
            Créez votre compte en 2 minutes. Aucune carte bancaire demandée.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="bg-background text-foreground hover:bg-muted">
              <Link href="/register">
                Créer mon compte gratuit <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10">
              <a href="mailto:contact@yelha.net">Nous contacter</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} YelhaDelivery. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">Restaurateur</Link>
            <Link href="/livreur/login" className="hover:text-foreground">Livreur</Link>
            <Link href="/cgu" className="hover:text-foreground">CGU</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
