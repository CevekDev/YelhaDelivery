import { requireRestaurateur } from '@/lib/auth';
import { PageHeader, PanelCard } from '@/components/dashboard/page-header';
import { PostForm } from '../post-form';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  await requireRestaurateur();
  return (
    <div className="container max-w-3xl space-y-6 py-6 md:py-8">
      <PageHeader eyebrow="Site web · Blog" title="Nouvel article" />
      <PanelCard>
        <PostForm />
      </PanelCard>
    </div>
  );
}
