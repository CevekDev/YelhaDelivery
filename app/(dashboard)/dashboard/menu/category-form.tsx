'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { createCategoryAction, deleteCategoryAction } from './actions';
import type { MenuCategory } from '@/types/database';

export function CategoryForm({ categories }: { categories: MenuCategory[] }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const res = await createCategoryAction(fd);
            if (!res.ok) setError(res.error || res.fieldErrors?.name || 'Erreur');
            else setName('');
          })
        }
        className="flex gap-2"
      >
        <Input
          name="name"
          placeholder="Nouvelle catégorie (ex: Entrées)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
        <input type="hidden" name="sort_order" value={categories.length} />
        <Button type="submit" disabled={isPending || !name.trim()}>
          Ajouter
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {categories.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-input px-3 py-1 text-sm"
            >
              {c.name}
              <form
                action={(fd) =>
                  startTransition(async () => {
                    if (!confirm(`Supprimer la catégorie « ${c.name} » ?`)) return;
                    fd.set('id', c.id);
                    const res = await deleteCategoryAction(fd);
                    if (!res.ok) setError(res.error || 'Erreur');
                  })
                }
              >
                <button
                  type="submit"
                  aria-label="Supprimer"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
