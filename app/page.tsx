import { getDemoRestaurantSlug, getShowcaseRestaurants } from '@/lib/public-data';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero, StatsBand } from '@/components/landing/landing-hero';
import { FeaturesSection, HowItWorks } from '@/components/landing/landing-features';
import { ShowcaseSection, WhyYelha } from '@/components/landing/landing-proof';
import { PricingSection, FaqSection } from '@/components/landing/landing-pricing';
import { FinalCta, LandingFooter } from '@/components/landing/landing-footer';

/* ═══════════════════════════════════════════════════════════════════
   Page d'accueil YelhaDelivery — composition des sections.
   Chaque section vit dans components/landing/*. Design : hero sombre +
   orange, sections alternées, mobile-first.
═══════════════════════════════════════════════════════════════════ */

// Rendu à la demande : les données (slug démo + vitrine) viennent de la DB mais
// restent mémorisées (unstable_cache 5 min), donc coût quasi nul par requête.
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const [demoSlug, showcase] = await Promise.all([
    getDemoRestaurantSlug(),
    getShowcaseRestaurants(6),
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-[#1A1A1A]">
      <LandingNav />
      <LandingHero demoSlug={demoSlug} />
      <StatsBand />
      <FeaturesSection />
      <HowItWorks />
      <ShowcaseSection restaurants={showcase} />
      <WhyYelha />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter demoSlug={demoSlug} />
    </div>
  );
}
