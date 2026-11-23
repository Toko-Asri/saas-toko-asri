import { Skeleton } from '@/components/ui'

// Kerangka pemuatan: ditampilkan Next.js (loading.tsx) selama data server diambil, agar halaman tidak terasa kosong.
export function SkeletonHalaman({ kpi = 4, baris = 6 }: { kpi?: number; baris?: number }) {
  return (
    <div role="status" aria-label="Memuat halaman" aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {kpi > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: kpi }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-36" />
              <Skeleton className="mt-3 h-3 w-28" />
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3"><Skeleton className="h-4 w-40" /></div>
        {Array.from({ length: baris }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  )
}

export function SkeletonPos() {
  return (
    <div role="status" aria-label="Memuat kasir" aria-busy="true" className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-card">
              <Skeleton className="size-9 rounded-xl" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-5 w-1/2" />
              <Skeleton className="mt-3 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-pop">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  )
}
