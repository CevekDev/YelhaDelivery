import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Plus } from 'lucide-react';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { PostRowActions } from './post-row-actions';
import type { BlogPost } from '@/types/database';

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function BlogAdminPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .returns<BlogPost[]>();

  const list = posts ?? [];

  return (
    <div className="container max-w-4xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Site web · Blog"
        title="Articles du blog"
        description={
          restaurant.blog_enabled ? (
            <>
              Le blog est actif :{' '}
              <Link href={`/r/${restaurant.slug}/blog`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                voir en ligne <ExternalLink className="h-3 w-3" />
              </Link>
            </>
          ) : (
            'Le blog est désactivé. Activez-le dans Site web pour le rendre visible.'
          )
        }
        actions={
          <Link
            href="/dashboard/site/blog/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </Link>
        }
      />

      {list.length === 0 ? (
        <PanelCard className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun article. Créez votre premier article !</p>
        </PanelCard>
      ) : (
        <PanelCard padded={false}>
          <ul className="divide-y divide-border">
            {list.map((post) => (
              <li key={post.id} className="flex items-center gap-4 p-4">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {post.cover_url && (
                    <Image src={post.cover_url} alt="" fill className="object-cover" sizes="80px" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{post.title}</p>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' +
                        (post.status === 'published'
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground')
                      }
                    >
                      {post.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {post.status === 'published'
                      ? `Publié le ${formatDate(post.published_at)}`
                      : `Créé le ${formatDate(post.created_at)}`}
                  </p>
                </div>
                <PostRowActions postId={post.id} />
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
    </div>
  );
}
