import { notFound } from 'next/navigation';
import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { PostForm } from '../../post-form';
import type { BlogPost } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurant.id)
    .maybeSingle<BlogPost>();

  if (!post) notFound();

  return (
    <div className="container max-w-3xl space-y-6 py-6 md:py-8">
      <PageHeader eyebrow="Site web · Blog" title="Modifier l’article" />
      <PanelCard>
        <PostForm post={post} />
      </PanelCard>
    </div>
  );
}
