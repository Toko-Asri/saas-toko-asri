import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { rentangPeriode, type KodePeriode } from '@/lib/periode'
import { Banner, BarisKosong, Card, PageHeader, Stat, Table, pilCls } from '@/components/ui'
import { GrafikHarian } from '@/components/grafik'

const PILIHAN: { kode: KodePeriode; label: string }[] = [
  { kode: 'hari-ini', label: 'Hari ini' },
  { kode: '7-hari', label: '7 hari' },
  { kode: '30-hari', label: '30 hari' },
  { kode: 'bulan-ini', label: 'Bulan ini' },
]

type Hari = { tanggal: string; jumlah_transaksi: number; penjualan: number; hpp: number; laba_kotor: number; kerugian_stok: number }
type ProdukLaporan = { product_id: string; nama: string; qty_terjual: number; penjualan: number; hpp: number; laba_kotor: number }

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams
  const kode: KodePeriode = PILIHAN.some((x) => x.kode === p) ? (p as KodePeriode) : '7-hari'
  const { dari, sampai } = rentangPeriode(kode)
  const supabase = await createClient()
  const [h, pr] = await Promise.all([
    supabase.rpc('laporan_keuangan', { p_dari: dari, p_sampai: sampai }),
    supabase.rpc('laporan_produk', { p_dari: dari, p_sampai: sampai }),
  ])
  const galat = h.error?.message ?? pr.error?.message
  const hari: Hari[] = ((h.data as Hari[] | null) ?? []).map((x) => ({
    ...x, penjualan: Number(x.penjualan), hpp: Number(x.hpp), laba_kotor: Number(x.laba_kotor), kerugian_stok: Number(x.kerugian_stok),
  }))
  const produk: ProdukLaporan[] = ((pr.data as ProdukLaporan[] | null) ?? []).map((x) => ({
    ...x, qty_terjual: Number(x.qty_terjual), penjualan: Number(x.penjualan), hpp: Number(x.hpp), laba_kotor: Number(x.laba_kotor),
  }))

  const jumlah = (f: (x: Hari) => number) => hari.reduce((a, x) => a + f(x), 0)
  const penjualan = jumlah((x) => x.penjualan)
  const hpp = jumlah((x) => x.hpp)
  const laba = penjualan - hpp
  const rugi = jumlah((x) => x.kerugian_stok)
  const transaksi = jumlah((x) => x.jumlah_transaksi)
  const margin = penjualan > 0 ? (laba / penjualan) * 100 : 0

  return (
    <div className="space-y-4">
      <PageHeader title="Laporan Keuangan" subtitle={`${dari === sampai ? formatTanggal(dari) : `${formatTanggal(dari)} s/d ${formatTanggal(sampai)}`} (WIB) · laba kotor = penjualan − HPP`} />
      <div className="flex gap-2">
        {PILIHAN.map((x) => (
          <Link key={x.kode} href={`/laporan?p=${x.kode}`}
            className={pilCls(kode === x.kode)}>{x.label}</Link>
        ))}
      </div>
      <Banner error={galat} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat judul={<>Penjualan ({transaksi} transaksi)</>}>{formatRupiah(penjualan)}</Stat>
        <Stat judul={<>HPP (harga pokok penjualan)</>}>{formatRupiah(hpp)}</Stat>
        <Stat judul={<>Laba kotor · margin {margin.toFixed(1)}%</>} nada="sukses">{formatRupiah(laba)}</Stat>
        <Stat judul={<>Kerugian stok (rusak, kedaluwarsa, hilang)</>} nada="bahaya">{formatRupiah(rugi)}</Stat>
        <Card><div className="text-sm text-slate-500">Laba setelah kerugian stok</div><div className={`text-2xl font-bold ${laba - rugi < 0 ? 'text-red-700' : ''}`}>{formatRupiah(laba - rugi)}</div></Card>
      </div>

      <GrafikHarian data={hari} />

      <h2 className="text-lg font-semibold">Produk berdasarkan laba kotor</h2>
      <Table head={['Produk', 'Terjual', 'Penjualan', 'HPP', 'Laba kotor']}>
        {produk.length === 0 && <BarisKosong colSpan={5}>Belum ada penjualan pada periode ini.</BarisKosong>}
        {produk.slice(0, 10).map((x) => (
          <tr key={x.product_id}>
            <td className="px-3 py-2 font-medium">{x.nama}</td>
            <td className="px-3 py-2">{x.qty_terjual}</td>
            <td className="px-3 py-2">{formatRupiah(x.penjualan)}</td>
            <td className="px-3 py-2">{formatRupiah(x.hpp)}</td>
            <td className="px-3 py-2 font-semibold text-emerald-700">{formatRupiah(x.laba_kotor)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
