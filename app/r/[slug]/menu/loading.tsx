export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Cover */}
      <div className="h-[260px] w-full animate-pulse bg-gray-200 md:h-[340px]" />
      {/* Info bar */}
      <div className="bg-white px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
      </div>
      {/* Category nav */}
      <div className="flex gap-4 border-b border-gray-100 bg-white px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-20 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
      {/* Items */}
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-4 w-16 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-[112px] w-[112px] shrink-0 animate-pulse rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
