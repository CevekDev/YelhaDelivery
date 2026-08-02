import { resolveLayout, type SiteSection } from '@/lib/site-sections';
import { type HomeViewProps, DEFAULT_HIGHLIGHTS } from './home-shared';
import { Hero } from './home-hero';
import { About, FinalCta, Gallery, Highlights, MenuPreview, TextBlock } from './home-sections';

export function HomeView(props: HomeViewProps) {
  const { template, restaurant, slug, featured } = props;
  const cfg = restaurant.site_config ?? {};
  const menuHref = `/r/${slug}/menu`;
  const heroTitle = cfg.hero_title || restaurant.name;
  const heroSubtitle =
    cfg.hero_subtitle ||
    restaurant.description ||
    'Découvrez notre carte et commandez en quelques clics, livré chez vous.';
  const ctaLabel = cfg.hero_cta || 'Voir le menu';
  const highlights = (cfg.highlights?.length ? cfg.highlights : DEFAULT_HIGHLIGHTS).slice(0, 3);
  const gallery = cfg.gallery?.slice(0, 8) ?? [];
  const hasAbout = Boolean(cfg.about_text || cfg.about_image_url);

  // Agencement libre : ordre + visibilité choisis par le restaurateur, sinon
  // l'ordre par défaut du template. Le hero et le CTA restent les bornes fixes.
  const layout = resolveLayout(template.heroStyle, cfg.layout);

  function renderSection(section: SiteSection) {
    switch (section.type) {
      case 'highlights':
        return <Highlights key={section.id} template={template} highlights={highlights} />;
      case 'about':
        return hasAbout ? (
          <About
            key={section.id}
            template={template}
            title={cfg.about_title || 'À propos de nous'}
            text={cfg.about_text || ''}
            imageUrl={cfg.about_image_url}
          />
        ) : null;
      case 'menu':
        return featured.length > 0 ? (
          <MenuPreview key={section.id} template={template} featured={featured} menuHref={menuHref} />
        ) : null;
      case 'gallery':
        return gallery.length > 0 ? (
          <Gallery key={section.id} template={template} gallery={gallery} />
        ) : null;
      case 'text':
        return section.title || section.body ? (
          <TextBlock
            key={section.id}
            title={section.title}
            body={section.body}
            cta={section.cta}
            menuHref={menuHref}
          />
        ) : null;
      default:
        return null;
    }
  }

  return (
    <main>
      <Hero {...props} heroTitle={heroTitle} heroSubtitle={heroSubtitle} ctaLabel={ctaLabel} menuHref={menuHref} />
      {layout.filter((s) => s.enabled).map(renderSection)}
      <FinalCta template={template} menuHref={menuHref} restaurant={restaurant} />
    </main>
  );
}
