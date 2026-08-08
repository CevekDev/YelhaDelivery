export default function AdminLoading() {
  return (
    <div className="container space-y-6 py-6 md:py-8">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-5 shadow-card">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
