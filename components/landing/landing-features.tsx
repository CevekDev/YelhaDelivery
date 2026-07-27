import { Bike, ChefHat, ShieldCheck, Smartphone, Sparkles, Store, TrendingUp, Utensils, Zap } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Tout ce qu&apos;il vous faut
        </span>
        <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          Tout en un. <span className="text-primary">Rien à installer.</span>
        </h2>
        <p className="mt-3 text-base text-gray-500">
          Conçu pour les restaurants algériens qui veulent reprendre le contrôle de leur livraison.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Store,
            color: 'bg-orange-50 text-primary',
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
            className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
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
  );
}

export function HowItWorks() {
  return (
    <section id="comment" className="scroll-mt-16 bg-[#0D0D0D] py-20 text-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-primary">
            <Zap className="h-3.5 w-3.5" /> Mise en route express
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Lancé en <span className="text-primary">3 étapes</span>
          </h2>
          <p className="mt-3 text-base text-white/60">
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
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    {s.badge}
                  </span>
                </div>
                <div className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
