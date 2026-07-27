import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

export function PricingSection() {
  return (
    <section id="tarifs" className="scroll-mt-16 bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            Tarif simple. <span className="text-primary">Gratuit.</span>
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Un seul plan. Toutes les fonctionnalités incluses.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-white shadow-xl">
            {/* Popular badge */}
            <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-lg">
              Recommandé
            </div>

            <div className="p-8">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500">
                Plan Restaurant
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-black text-5xl text-[#1A1A1A]">Gratuit</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Pour toujours. Aucune carte bancaire.</p>

              <Link
                href="/register"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.30)] transition-all hover:bg-primary-dark"
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
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Combien ça coûte vraiment ?',
    a: 'C’est gratuit, sans commission sur vos ventes ni frais cachés. Vous gardez 100 % de ce que paient vos clients.',
  },
  {
    q: 'Alors comment YelhaDelivery se finance ?',
    a: 'L’essentiel restera toujours gratuit. À l’avenir, des options avancées et facultatives pourront être proposées — mais jamais de commission prélevée sur vos commandes.',
  },
  {
    q: 'Et si je n’ai pas de livreurs ?',
    a: 'Vous pouvez démarrer avec un seul livreur, les vôtres, ou livrer vous-même. Vous créez leurs comptes en quelques secondes et ils reçoivent les commandes sur leur téléphone.',
  },
  {
    q: 'Comment mes clients paient-ils ?',
    a: 'En espèces, à la livraison — le mode le plus courant en Algérie. Aucune carte ni intégration bancaire nécessaire.',
  },
  {
    q: 'À qui appartiennent mes clients et mes données ?',
    a: 'À vous, à 100 %. Contrairement aux grandes plateformes, vos clients restent les vôtres. Vos données sont hébergées en Europe.',
  },
  {
    q: 'Combien de temps pour être en ligne ?',
    a: 'Environ 5 minutes : créez votre compte, ajoutez quelques plats, et votre lien de commande est prêt à partager sur Instagram ou WhatsApp.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <MessageSquare className="h-3.5 w-3.5" /> Questions fréquentes
        </span>
        <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
          Tout ce que vous vous demandez
        </h2>
      </div>
      <div className="mt-10 space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {f.q}
              <span className="shrink-0 text-xl leading-none text-primary transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
