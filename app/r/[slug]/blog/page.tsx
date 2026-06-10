import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import type { BlogPost, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Pick<Restaurant, 'name'>>();
  if (!data) return { title: 'Introuvable' };
  return { title: `Blog — ${data.name}` };
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant || !restaurant.blog_enabled) notFound();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .returns<BlogPost[]>();

  const template = getTemplate(restaurant.template_id);
  const list = posts ?? [];

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <main className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">
            Le blog
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-site-heading)] text-4xl font-bold md:text-5xl">
            Actualités &amp; gourmandises
          </h1>
          <p className="mt-4 text-lg text-[color:var(--site-muted)]">
            Recettes, nouveautés et coulisses de {restaurant.name}.
          </p>
        </header>

        {list.length === 0 ? (
          <div className="mt-16 rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] py-20 text-center">
            <p className="text-[color:var(--site-muted)]">Aucun article pour le moment. Revenez bientôt !</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {list.map((post) => (
              <Link
                key={post.id}
                href={`/r/${slug}/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] transition-transform hover:-translate-y-1"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--site-bg)]">
                  {post.cover_url ? (
                    <Image
                      src={post.cover_url}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--site-accent)]/30 to-[var(--site-surface)]" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <time className="text-xs font-medium uppercase tracking-wide text-[color:var(--site-muted)]">
                    {formatDate(post.published_at)}
                  </time>
                  <h2 className="mt-2 font-[family-name:var(--font-site-heading)] text-xl font-bold leading-snug">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--site-muted)]">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="mt-4 text-sm font-semibold text-[color:var(--site-accent)]">
                    Lire l&apos;article →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </SiteShell>
  );
}
