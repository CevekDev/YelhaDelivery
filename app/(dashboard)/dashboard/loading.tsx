export default function DashboardLoading() {
  return (
    <div className="container space-y-6 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-background p-4 shadow-card">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
