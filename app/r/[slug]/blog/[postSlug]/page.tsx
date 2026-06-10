import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import type { BlogPost, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Pick<Restaurant, 'id' | 'name'>>();
  if (!restaurant) return { title: 'Introuvable' };
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', postSlug)
    .eq('status', 'published')
    .maybeSingle<Pick<BlogPost, 'title' | 'excerpt'>>();
  if (!post) return { title: 'Article introuvable' };
  return { title: `${post.title} — ${restaurant.name}`, description: post.excerpt ?? undefined };
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant || !restaurant.blog_enabled) notFound();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', postSlug)
    .eq('status', 'published')
    .maybeSingle<BlogPost>();

  if (!post) notFound();

  const template = getTemplate(restaurant.template_id);

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <Link
          href={`/r/${slug}/blog`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--site-muted)] hover:text-[color:var(--site-text)]"
        >
          <ArrowLeft className="h-4 w-4" /> Tous les articles
        </Link>

        <header className="mt-6">
          <time className="text-sm font-medium uppercase tracking-wide text-[color:var(--site-accent)]">
            {formatDate(post.published_at)}
          </time>
          <h1 className="mt-3 font-[family-name:var(--font-site-heading)] text-4xl font-bold leading-tight md:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-[color:var(--site-muted)]">
              {post.excerpt}
            </p>
          )}
        </header>

        {post.cover_url && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]">
            <Image src={post.cover_url} alt={post.title} fill priority className="object-cover" sizes="(min-width:768px) 768px, 100vw" />
          </div>
        )}

        <div className="mt-10 space-y-5 whitespace-pre-line text-lg leading-relaxed text-[color:var(--site-text)]">
          {post.content}
        </div>
      </article>
    </SiteShell>
  );
}
