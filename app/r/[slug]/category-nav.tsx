'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  categories: { id: string; name: string }[];
  hasUncategorized: boolean;
  hasExtras?: boolean;
  hasPromos?: boolean;
}

export function CategoryNav({ categories, hasUncategorized, hasExtras, hasPromos }: Props) {
  const all = [
    ...(hasPromos ? [{ id: 'promos', name: '🏷️ Offres' }] : []),
    ...categories.map((c) => ({ id: c.id, name: c.name })),
    ...(hasUncategorized ? [{ id: 'other', name: 'Autres' }] : []),
    ...(hasExtras ? [{ id: 'extras', name: 'Suppléments' }] : []),
  ];

  const [active, setActive] = useState<string | null>(all[0]?.id ?? null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = all.map((c) => `cat-${c.id}`);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const id = visible.target.id.replace('cat-', '');
          setActive(id);
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, hasUncategorized, hasExtras, hasPromos]);

  useEffect(() => {
    if (!active || !scrollerRef.current) return;
    const btn = scrollerRef.current.querySelector<HTMLAnchorElement>(`[data-cat="${active}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <nav className="sticky top-14 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div
        ref={scrollerRef}
        className="container flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {all.map((c) => {
          const isActive = active === c.id;
          return (
            <a
              key={c.id}
              data-cat={c.id}
              href={`#cat-${c.id}`}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {c.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
