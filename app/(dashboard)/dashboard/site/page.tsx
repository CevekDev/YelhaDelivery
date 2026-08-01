import Link from 'next/link';
import { ExternalLink, Newspaper } from 'lucide-react';
import { requireRestaurateur } from '@/lib/auth';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { getTemplate } from '@/lib/templates';
import { editorLayout } from '@/lib/site-sections';
import { SiteSettingsForm } from './site-settings-form';
import { SiteContentForm } from './site-content-form';
import { SiteLayoutEditor } from './site-layout-editor';
import { SiteAccentPicker } from './site-accent-picker';
import { SitePreviewPanel } from './site-preview-panel';

export const dynamic = 'force-dynamic';

export default async function SiteWebPage() {
  const { restaurant } = await requireRestaurateur();
  const template = getTemplate(restaurant.template_id);
  const initialLayout = editorLayout(template.heroStyle, restaurant.site_config?.layout);

  return (
    <div className="container max-w-6xl space-y-6 py-6 md:py-8">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Aperçu — en haut sur mobile, colonne droite sticky sur desktop */}
        <div className="order-1 xl:order-2">
          <div className="xl:sticky xl:top-6">
            <SitePreviewPanel />
          </div>
        </div>

        {/* Éditeur */}
        <div className="order-2 space-y-6 xl:order-1">
      <PanelCard padded={false}>
        <PanelHeader
          title="Design & pages"
          description="8 modèles de site, chacun avec sa typographie et son ambiance."
        />
        <div className="p-5 md:p-6">
          <SiteSettingsForm
            initialTemplateId={restaurant.template_id}
            initialHome={restaurant.home_enabled}
            initialBlog={restaurant.blog_enabled}
            cuisineHint={restaurant.cuisine_type || restaurant.description || ''}
          />
        </div>
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader
          title="Couleur de marque"
          description="La couleur d’accent de vos boutons, prix et éléments mis en avant."
        />
        <div className="p-5 md:p-6">
          <SiteAccentPicker
            initialAccent={restaurant.site_config?.accent ?? ''}
            templateAccent={template.palette.accent}
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

      <PanelCard padded={false}>
        <PanelHeader
          title="Agencement de la page d’accueil"
          description="Réordonnez avec les flèches, masquez ce que vous ne voulez pas, ajoutez vos propres blocs de texte."
        />
        <div className="p-5 md:p-6">
          <SiteLayoutEditor initialLayout={initialLayout} />
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
      </div>
    </div>
  );
}
