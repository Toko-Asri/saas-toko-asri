import { formatRupiah, formatTanggal } from '@/lib/format'
import { Card } from '@/components/ui'

export type TitikHarian = { tanggal: string; penjualan: number; laba_kotor: number }

// Grafik batang harian (penjualan dan laba kotor) tanpa pustaka; dipakai Laporan Keuangan dan Dashboard.
export function GrafikHarian({ data, judul = 'Penjualan dan laba kotor per hari' }: { data: TitikHarian[]; judul?: string }) {
  const maks = Math.max(1, ...data.map((x) => x.penjualan))
  const total = data.reduce((a, x) => a + x.penjualan, 0)
  return (
    <Card>
      <h2 className="mb-2 font-semibold">{judul}</h2>
      <div role="img" aria-label={`Grafik batang penjualan harian, total ${formatRupiah(total)}`} className="flex h-40 items-end gap-1 overflow-x-auto">
        {data.map((x) => (
          <div key={x.tanggal} className="flex min-w-3 flex-1 flex-col items-center justify-end" title={`${formatTanggal(x.tanggal)}: penjualan ${formatRupiah(x.penjualan)}, laba kotor ${formatRupiah(x.laba_kotor)}`}>
            <div className="flex h-36 w-full items-end gap-px">
              <div className="flex-1 rounded-t bg-sky-600" style={{ height: `${(x.penjualan / maks) * 100}%` }} />
              <div className="flex-1 rounded-t bg-emerald-500" style={{ height: `${(Math.max(x.laba_kotor, 0) / maks) * 100}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-slate-500">{x.tanggal.slice(8)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-600"><span><span className="mr-1 inline-block h-2 w-2 bg-sky-600" />Penjualan</span><span><span className="mr-1 inline-block h-2 w-2 bg-emerald-500" />Laba kotor</span></div>
    </Card>
  )
}
