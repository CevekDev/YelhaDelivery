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
    <nav className="sticky top-14 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div
        ref={scrollerRef}
        className="mx-auto flex max-w-5xl gap-0 overflow-x-auto px-4 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {all.map((c) => {
          const isActive = active === c.id;
          return (
            <a
              key={c.id}
              data-cat={c.id}
              href={`#cat-${c.id}`}
              className={cn(
                'shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900',
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
