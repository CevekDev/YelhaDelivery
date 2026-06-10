'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createPostAction, updatePostAction, type BlogResult } from './actions';
import type { BlogPost } from '@/types/database';

export function PostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEdit = !!post;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const action = isEdit ? updatePostAction.bind(null, post!.id) : createPostAction;

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
          const res: BlogResult = await action(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            router.push('/dashboard/site/blog');
            router.refresh();
          }
        })
      }
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input id="title" name="title" required maxLength={160} defaultValue={post?.title ?? ''} placeholder="Notre nouvelle recette de l’automne" aria-invalid={!!fieldErrors.title} />
        {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Lien (optionnel)</Label>
        <Input id="slug" name="slug" maxLength={160} defaultValue={post?.slug ?? ''} placeholder="généré depuis le titre si vide" aria-invalid={!!fieldErrors.slug} />
        {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Résumé (optionnel)</Label>
        <Textarea id="excerpt" name="excerpt" maxLength={320} rows={2} defaultValue={post?.excerpt ?? ''} placeholder="Une courte accroche affichée dans la liste des articles." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image">Image de couverture</Label>
        {post?.cover_url && (
          <div className="flex items-center gap-3">
            <Image src={post.cover_url} alt="" width={96} height={60} className="h-16 w-28 rounded-lg border border-border object-cover" />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="remove_cover" value="true" />
              Supprimer la couverture
            </label>
          </div>
        )}
        <Input id="cover_image" name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Contenu *</Label>
        <Textarea id="content" name="content" required rows={14} defaultValue={post?.content ?? ''} placeholder="Rédigez votre article ici…" aria-invalid={!!fieldErrors.content} />
        {fieldErrors.content && <p className="text-xs text-destructive">{fieldErrors.content}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <select
          id="status"
          name="status"
          defaultValue={post?.status ?? 'draft'}
          className="flex h-11 w-full max-w-xs rounded-md border border-border bg-input px-3 text-sm"
        >
          <option value="draft">Brouillon (non visible)</option>
          <option value="published">Publié (visible sur le site)</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer l’article'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/site/blog')}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
