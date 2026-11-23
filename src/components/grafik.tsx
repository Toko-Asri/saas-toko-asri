import { ringkasRupiah, formatRupiah, formatTanggal } from '@/lib/format'
import { batasAtas } from '@/lib/grafik'
import { Card } from '@/components/ui'

export type TitikHarian = { tanggal: string; penjualan: number; laba_kotor: number }

// Grafik batang harian (penjualan dan laba kotor) tanpa pustaka: grid + sumbu Y ringkas, tooltip saat hover/fokus,
// batang tumbuh bertahap saat muncul (dinonaktifkan oleh prefers-reduced-motion). Dipakai Laporan Keuangan dan Dashboard.
export function GrafikHarian({ data, judul = 'Penjualan dan laba kotor per hari' }: { data: TitikHarian[]; judul?: string }) {
  const maks = batasAtas(Math.max(0, ...data.map((x) => x.penjualan)))
  const total = data.reduce((a, x) => a + x.penjualan, 0)
  const tick = [1, 0.5, 0]
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{judul}</h2>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-500" />Penjualan</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-mint-600" />Laba kotor</span>
        </div>
      </div>
      <div role="img" aria-label={`Grafik batang penjualan harian, total ${formatRupiah(total)}`} className="relative">
        {/* grid + sumbu Y */}
        <div aria-hidden className="absolute inset-x-0 top-0 flex h-44 flex-col justify-between">
          {tick.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="tabular w-14 shrink-0 text-right text-[10px] text-slate-400">{ringkasRupiah(maks * t)}</span>
              <span className="h-px flex-1 bg-slate-200/70" />
            </div>
          ))}
        </div>
        <div className="relative flex h-44 items-end gap-1.5 pl-16">
          {data.map((x, i) => (
            <div key={x.tanggal} tabIndex={0} className="group/bar relative flex h-full min-w-2 flex-1 items-end gap-0.5 rounded-md outline-none focus-visible:bg-brand-50/60" title={`${formatTanggal(x.tanggal)}: penjualan ${formatRupiah(x.penjualan)}, laba kotor ${formatRupiah(x.laba_kotor)}`}>
              <div className="bar-grow w-full flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-[filter] group-hover/bar:brightness-110" style={{ height: `${(x.penjualan / maks) * 100}%`, '--i': i } as React.CSSProperties} />
              <div className="bar-grow w-full flex-1 rounded-t-md bg-gradient-to-t from-mint-700 to-mint-600/80 transition-[filter] group-hover/bar:brightness-110" style={{ height: `${(Math.max(x.laba_kotor, 0) / maks) * 100}%`, '--i': i } as React.CSSProperties} />
              <div aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-pop group-hover/bar:block group-focus-visible/bar:block">
                <div className="font-semibold">{formatTanggal(x.tanggal)}</div>
                <div className="tabular text-brand-200">Penjualan {formatRupiah(x.penjualan)}</div>
                <div className="tabular text-mint-100">Laba kotor {formatRupiah(x.laba_kotor)}</div>
              </div>
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1.5 flex gap-1.5 pl-16">
          {data.map((x, i) => (
            <div key={x.tanggal} className={`min-w-2 flex-1 text-center text-[10px] text-slate-500 ${data.length > 16 && i % 2 === 1 ? 'hidden sm:block sm:invisible' : ''}`}>{x.tanggal.slice(8)}</div>
          ))}
        </div>
      </div>
    </Card>
  )
}
