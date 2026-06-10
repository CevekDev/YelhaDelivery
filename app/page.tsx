import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChefHat,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Page d'accueil YelhaDelivery
   Design : hero sombre + orange, sections alternées, mobile-first
═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#1A1A1A]">
      {/* ── Navbar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5C1A] text-sm font-black text-white">
              Y
            </span>
            <span className="font-extrabold tracking-tight">
              Yelha<span className="text-[#FF5C1A]">Delivery</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-500 md:flex">
            <a href="#fonctionnalites" className="hover:text-[#1A1A1A]">Fonctionnalités</a>
            <a href="#comment" className="hover:text-[#1A1A1A]">Comment ça marche</a>
            <a href="#tarifs" className="hover:text-[#1A1A1A]">Tarifs</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 md:inline-flex"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5C1A] px-4 py-2 text-sm font-bold text-white shadow-[0_2px_10px_rgb(255,92,26,0.35)] transition-all hover:bg-[#e84f14] active:scale-[0.98]"
            >
              Démarrer gratuitement
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0D0D0D] text-white">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#FF5C1A]/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#FF5C1A]/10 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 md:px-6 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#FF5C1A]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF5C1A]" />
                Plateforme pensée pour l&apos;Algérie 🇩🇿
              </div>

              <h1 className="mt-6 text-[2.6rem] font-black leading-[1.05] tracking-tight md:text-6xl lg:text-[4rem]">
                Gérez votre
                <br />
                <span className="text-[#FF5C1A]">livraison.</span>
                <br />
                Sans commission.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
                Menu en ligne, commandes en temps réel, livreurs intégrés — tout en un.
                Paiement cash à la livraison, 0% de commission prélevé.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5C1A] px-6 py-3.5 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.40)] transition-all hover:bg-[#e84f14] active:scale-[0.99]"
                >
                  Inscrire mon restaurant
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/r/el-bahia-alger"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/10"
                >
                  Voir un menu démo
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/40">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#FF5C1A]" />
                  Inscription gratuite
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#FF5C1A]" />
                  2 min pour démarrer
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#FF5C1A]" />
                  Sans engagement
                </span>
              </div>
            </div>

            {/* Right — Dashboard mock */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto w-full max-w-sm">
                {/* Phone frame */}
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1A1A1A] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)]">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-6 py-3">
                    <span className="text-[11px] font-semibold text-white/40">9:41</span>
                    <div className="h-3 w-20 rounded-full bg-black" />
                    <div className="flex items-center gap-1">
                      <span className="block h-2.5 w-1 rounded-sm bg-white/40" />
                      <span className="block h-2.5 w-1 rounded-sm bg-white/40" />
                      <span className="block h-2.5 w-1 rounded-sm bg-white/60" />
                      <span className="block h-2.5 w-1 rounded-sm bg-white/80" />
                    </div>
                  </div>

                  {/* App content */}
                  <div className="px-4 pb-6">
                    {/* New order alert */}
                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#FF5C1A] p-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <Smartphone className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Nouvelle commande !</p>
                        <p className="text-[10px] text-white/70">Karim B. · 1 850 DA</p>
                      </div>
                      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#FF5C1A]">
                        1
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      {[
                        { label: 'Commandes', val: '14', icon: '🛍️' },
                        { label: 'CA du jour', val: '24 500 DA', icon: '💰' },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl border border-white/5 bg-white/5 p-3"
                        >
                          <p className="text-base">{s.icon}</p>
                          <p className="mt-1 font-black text-white">{s.val}</p>
                          <p className="text-[10px] text-white/40">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Order list */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Dernières commandes
                      </p>
                      {[
                        { name: 'Karim B.', status: 'En préparation', amount: '1 850', color: 'bg-amber-500' },
                        { name: 'Amira K.', status: 'En livraison', amount: '2 300', color: 'bg-blue-500' },
                        { name: 'Yacine M.', status: 'Livré', amount: '950', color: 'bg-green-500' },
                      ].map((o) => (
                        <div
                          key={o.name}
                          className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 p-2.5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black text-white">
                            {o.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-white">
                              {o.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${o.color}`} />
                              <p className="text-[10px] text-white/40">{o.status}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-white">{o.amount} DA</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -right-8 top-16 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-white">4.9 / 5</span>
                </div>
                <div className="absolute -left-10 bottom-24 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
                  <span className="text-lg">🚀</span>
                  <div>
                    <p className="text-[10px] font-bold text-white">Actif en 5 min</p>
                    <p className="text-[9px] text-white/50">Inscription gratuite</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { val: '0%', label: 'Commission prélevée', icon: '💸' },
              { val: 'Cash', label: 'Paiement à la livraison', icon: '💵' },
              { val: '5 min', label: "Pour lancer votre menu", icon: '⚡' },
              { val: '24/7', label: 'Plateforme disponible', icon: '🛡️' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl">{s.icon}</p>
                <p className="mt-1 font-black text-[1.6rem] leading-none text-[#1A1A1A] md:text-3xl">
                  {s.val}
                </p>
                <p className="mt-1 text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FF5C1A]/10 px-3 py-1 text-xs font-bold text-[#FF5C1A]">
            <Sparkles className="h-3.5 w-3.5" /> Tout ce qu&apos;il vous faut
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Tout en un. <span className="text-[#FF5C1A]">Rien à installer.</span>
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Conçu pour les restaurants algériens qui veulent reprendre le contrôle de leur livraison.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Store,
              color: 'bg-orange-50 text-[#FF5C1A]',
              title: 'Menu en ligne illimité',
              desc: 'Plats, photos, catégories, prix en DA, sauces, suppléments, offres. Modifications instantanées.',
            },
            {
              icon: Smartphone,
              color: 'bg-blue-50 text-blue-600',
              title: 'Commandes en temps réel',
              desc: 'Notification sonore à chaque commande. Tableau de bord mobile-first. Statuts en direct.',
            },
            {
              icon: Bike,
              color: 'bg-green-50 text-green-600',
              title: 'Vos livreurs intégrés',
              desc: 'Créez les comptes de vos livreurs. Assignez des commandes. Ils gèrent leurs tournées.',
            },
            {
              icon: Utensils,
              color: 'bg-purple-50 text-purple-600',
              title: 'Cash à la livraison',
              desc: 'Pas d\'intégration paiement. Vos livreurs encaissent. Simple, rapide, algérien.',
            },
            {
              icon: TrendingUp,
              color: 'bg-amber-50 text-amber-600',
              title: 'Statistiques & revenus',
              desc: 'Chiffre d\'affaires, commandes, avis clients — tout visualisé en un coup d\'œil.',
            },
            {
              icon: ShieldCheck,
              color: 'bg-emerald-50 text-emerald-600',
              title: 'Sécurisé & conforme',
              desc: 'Données hébergées en Europe. Accès par rôle (restaurateur / livreur / admin).',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[#FF5C1A]/20 hover:shadow-md"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} transition-transform group-hover:scale-110`}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ─────────────────────────────────────── */}
      <section id="comment" className="bg-[#0D0D0D] py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-[#FF5C1A]">
              <Zap className="h-3.5 w-3.5" /> Mise en route express
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Lancé en <span className="text-[#FF5C1A]">3 étapes</span>
            </h2>
            <p className="mt-3 text-base text-white/50">
              Pas de contrat, pas de technicien. Vous gérez tout vous-même.
            </p>
          </div>

          <div className="relative mt-14">
            {/* Connector line desktop */}
            <div className="absolute left-1/2 top-10 hidden h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" />

            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  n: '01',
                  icon: ChefHat,
                  title: 'Créez votre compte',
                  desc: 'Inscription en 2 minutes. Nom, slug, email — et c\'est tout. Aucune carte bancaire.',
                  badge: 'Gratuit',
                },
                {
                  n: '02',
                  icon: Store,
                  title: 'Construisez votre menu',
                  desc: 'Ajoutez vos plats, photos, catégories, sauces et prix en DA. Modifications en temps réel.',
                  badge: 'Immédiat',
                },
                {
                  n: '03',
                  icon: Bike,
                  title: 'Recevez vos commandes',
                  desc: 'Partagez votre lien. Activez votre restaurant. Chaque commande arrive en notification.',
                  badge: 'En direct',
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="relative rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-black text-5xl leading-none text-white/10">{s.n}</span>
                    <span className="rounded-full bg-[#FF5C1A]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#FF5C1A]">
                      {s.badge}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF5C1A]/15 text-[#FF5C1A]">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pourquoi Yelha ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FF5C1A]/10 px-3 py-1 text-xs font-bold text-[#FF5C1A]">
              <MessageSquare className="h-3.5 w-3.5" /> Fait pour vous
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              Pensé pour les
              <br />
              <span className="text-[#FF5C1A]">restaurants algériens</span>
            </h2>
            <p className="mt-4 text-base text-gray-500">
              Les grandes plateformes prennent entre 15% et 30% sur chaque commande.
              YelhaDelivery vous donne votre propre page de commande — sans commission,
              sans partage de vos clients.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Votre propre lien de commande (ex: yelha.net/r/votre-resto)',
                'Paiement en espèces — adapté au marché algérien',
                'Livreurs gérés directement par vous',
                'Avis clients rattachés à votre restaurant',
                'Code promo personnalisé pour fidéliser vos clients',
                'Suivi commande en temps réel pour vos clients',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5C1A]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Comparison table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 px-5 py-3.5 text-xs font-bold text-gray-400">
              <span>Critère</span>
              <span className="text-center">Grandes plateformes</span>
              <span className="text-center text-[#FF5C1A]">YelhaDelivery</span>
            </div>
            {[
              { label: 'Commission', other: '15–30%', ours: '0%', win: true },
              { label: 'Vos données clients', other: 'Partagées', ours: 'À vous', win: true },
              { label: 'Vos livreurs', other: 'Imposés', ours: 'Les vôtres', win: true },
              { label: 'Code promo', other: '❌', ours: '✓', win: true },
              { label: 'Paiement cash', other: 'Non', ours: 'Oui', win: true },
              { label: 'Page sur mesure', other: '❌', ours: '✓ Votre lien', win: true },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 items-center px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <span className="font-medium text-gray-700">{row.label}</span>
                <span className="text-center text-gray-400">{row.other}</span>
                <span className="text-center font-bold text-[#FF5C1A]">{row.ours}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ───────────────────────────────────────────────── */}
      <section id="tarifs" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">
              Tarif simple. <span className="text-[#FF5C1A]">Gratuit.</span>
            </h2>
            <p className="mt-3 text-base text-gray-500">
              Un seul plan. Toutes les fonctionnalités incluses.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-md">
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#FF5C1A]/30 bg-white shadow-xl">
              {/* Popular badge */}
              <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-[#FF5C1A] px-3 py-1 text-xs font-bold text-white shadow-lg">
                Recommandé
              </div>

              <div className="p-8">
                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">
                  Plan Restaurant
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-black text-5xl text-[#1A1A1A]">Gratuit</span>
                </div>
                <p className="mt-1 text-sm text-gray-400">Pour toujours. Aucune carte bancaire.</p>

                <Link
                  href="/register"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5C1A] py-3.5 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.30)] transition-all hover:bg-[#e84f14]"
                >
                  Créer mon restaurant
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <ul className="mt-6 space-y-3">
                  {[
                    'Menu illimité (plats, photos, catégories)',
                    'Sauces, suppléments, offres du moment',
                    'Variantes (tailles) par plat',
                    'Commandes en temps réel',
                    'Gestion des livreurs',
                    'Codes promo personnalisés',
                    'Suivi commande client',
                    'Statistiques & chiffre d\'affaires',
                    'Avis clients',
                    'Horaires d\'ouverture',
                    'Données hébergées en Europe',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FF5C1A]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0D0D0D] px-8 py-16 text-center text-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)]">
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#FF5C1A]/20 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#FF5C1A]/15 blur-[60px]" />

          <div className="relative">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5C1A]/20 text-[#FF5C1A]">
              <Zap className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">
              Prêt à digitaliser
              <br />
              <span className="text-[#FF5C1A]">votre livraison ?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-white/50">
              Créez votre compte en 2 minutes. Partagez votre lien.
              Recevez votre première commande aujourd&apos;hui.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-8 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.35)] transition-all hover:bg-[#e84f14] active:scale-[0.99]"
              >
                Inscrire mon restaurant gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:contact@yelha.net"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-base font-semibold text-white/70 transition-all hover:border-white/20 hover:text-white"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5C1A] text-sm font-black text-white">
                  Y
                </span>
                <span className="font-extrabold tracking-tight">
                  Yelha<span className="text-[#FF5C1A]">Delivery</span>
                </span>
              </Link>
              <p className="mt-2 max-w-xs text-xs text-gray-400">
                Plateforme de gestion de livraison pour restaurants algériens.
                Données hébergées en Europe 🇪🇺
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                  Accès
                </p>
                <Link href="/login" className="block hover:text-[#FF5C1A]">Restaurateur</Link>
                <Link href="/livreur/login" className="block hover:text-[#FF5C1A]">Livreur</Link>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                  Légal
                </p>
                <Link href="/cgu" className="block hover:text-[#FF5C1A]">CGU</Link>
                <a href="mailto:contact@yelha.net" className="block hover:text-[#FF5C1A]">Contact</a>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                  Démo
                </p>
                <Link href="/r/el-bahia-alger" className="block hover:text-[#FF5C1A]">
                  Voir un menu
                </Link>
                <Link href="/register" className="block hover:text-[#FF5C1A]">
                  S&apos;inscrire
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row">
            <p>© {new Date().getFullYear()} YelhaDelivery. Tous droits réservés.</p>
            <p className="flex items-center gap-1">
              Fait avec <span className="text-[#FF5C1A]">♥</span> pour l&apos;Algérie
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
