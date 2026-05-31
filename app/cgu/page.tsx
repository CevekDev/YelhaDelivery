import Link from 'next/link';

export const metadata = {
  title: "Conditions d'utilisation",
};

export default function CguPage() {
  return (
    <main className="container max-w-3xl py-10">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Accueil
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold">Conditions d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-xl font-bold">1. Objet</h2>
          <p className="text-muted-foreground">
            YelhaDelivery est une plateforme SaaS de gestion de livraison destinée aux restaurants
            algériens. Elle met à disposition un dashboard, un menu en ligne public et un espace
            livreur. L&apos;utilisation du service implique l&apos;acceptation pleine et entière
            des présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">2. Inscription et compte</h2>
          <p className="text-muted-foreground">
            La création d&apos;un compte restaurateur est gratuite. Vous garantissez fournir des
            informations exactes (nom du restaurant, adresse, téléphone). Vous êtes responsable
            de la confidentialité de votre mot de passe. Votre page publique est mise en ligne
            dès l&apos;inscription.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">3. Contenu publié</h2>
          <p className="text-muted-foreground">
            Vous êtes seul responsable du contenu publié sur votre page : photos, descriptions
            de plats, prix, disponibilité. Vous garantissez disposer des droits nécessaires sur
            les images uploadées. Tout contenu illégal, offensant ou trompeur entraînera la
            suspension immédiate du compte.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">4. Paiement et commandes</h2>
          <p className="text-muted-foreground">
            Le paiement entre client et restaurant s&apos;effectue exclusivement en espèces à la
            livraison. YelhaDelivery n&apos;intervient pas dans la transaction monétaire. Les
            informations clients (nom, téléphone, adresse) sont transmises au restaurant pour
            l&apos;exécution de la commande uniquement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">5. Données personnelles</h2>
          <p className="text-muted-foreground">
            Les données personnelles collectées sont traitées conformément à la loi algérienne
            18-07 relative à la protection des données. Vous pouvez à tout moment demander
            l&apos;accès, la rectification ou la suppression de vos données en contactant{' '}
            <a href="mailto:contact@yelha.net" className="text-primary hover:underline">
              contact@yelha.net
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">6. Suspension et résiliation</h2>
          <p className="text-muted-foreground">
            YelhaDelivery se réserve le droit de suspendre ou supprimer tout compte en cas de
            violation des présentes conditions. Vous pouvez supprimer votre compte à tout moment
            sur simple demande.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">7. Contact</h2>
          <p className="text-muted-foreground">
            Pour toute question :{' '}
            <a href="mailto:contact@yelha.net" className="text-primary hover:underline">
              contact@yelha.net
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
