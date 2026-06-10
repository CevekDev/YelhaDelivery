import Link from 'next/link';
import { ExternalLink, Newspaper } from 'lucide-react';
import { requireRestaurateur } from '@/lib/auth';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { SiteSettingsForm } from './site-settings-form';
import { SiteContentForm } from './site-content-form';

export const dynamic = 'force-dynamic';

export default async function SiteWebPage() {
  const { restaurant } = await requireRestaurateur();

  return (
    <div className="container max-w-4xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Site web"
        title="Votre site web"
        description="Choisissez un design, activez vos pages et personnalisez le contenu. Votre menu de commande reste toujours accessible."
        actions={
          <Link
            href={`/r/${restaurant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Voir mon site
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <PanelCard padded={false}>
        <PanelHeader
          title="Design & pages"
          description="7 modèles de site, chacun avec sa typographie et son ambiance."
        />
        <div className="p-5 md:p-6">
          <SiteSettingsForm
            initialTemplateId={restaurant.template_id}
            initialHome={restaurant.home_enabled}
            initialBlog={restaurant.blog_enabled}
          />
        </div>
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader
          title="Contenu"
          description="Textes, histoire, galerie et réseaux sociaux affichés sur votre site."
        />
        <div className="p-5 md:p-6">
          <SiteContentForm config={restaurant.site_config ?? {}} />
        </div>
      </PanelCard>

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold">Blog</p>
              <p className="text-sm text-muted-foreground">
                {restaurant.blog_enabled
                  ? 'Rédigez et publiez vos articles.'
                  : 'Activez le blog ci-dessus pour afficher vos articles sur le site.'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/site/blog"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            Gérer le blog
          </Link>
        </div>
      </PanelCard>
    </div>
  );
}
