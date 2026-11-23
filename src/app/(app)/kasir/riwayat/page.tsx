import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { rentangPeriode, type KodePeriode } from '@/lib/periode'
import { BarisKosong, PageHeader, Stat, Table, pilCls } from '@/components/ui'

const PILIHAN: { kode: KodePeriode; label: string }[] = [
  { kode: 'hari-ini', label: 'Hari ini' },
  { kode: '7-hari', label: '7 hari' },
  { kode: '30-hari', label: '30 hari' },
]
const BATAS = 200
const NAMA_METODE: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }
const waktu = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export default async function RiwayatPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams
  const kode: KodePeriode = p === '7-hari' || p === '30-hari' ? p : 'hari-ini'
  const { dari, sampai } = rentangPeriode(kode)
  const [y, m, d] = sampai.split('-').map(Number)
  const besok = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  const supabase = await createClient()
  // RLS: kasir hanya melihat penjualannya sendiri; pemilik melihat semua.
  const { data, count } = await supabase.from('sales')
    .select('id, nomor, metode, total, created_at', { count: 'exact' })
    .gte('created_at', `${dari}T00:00:00+07:00`).lt('created_at', `${besok}T00:00:00+07:00`)
    .order('created_at', { ascending: false }).limit(BATAS)
  const baris = data ?? []
  const jumlah = count ?? baris.length
  const terpotong = jumlah > baris.length
  const jumlahRupiah = baris.reduce((a, s) => a + Number(s.total), 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Riwayat Penjualan" subtitle={`${dari === sampai ? dari : `${dari} s/d ${sampai}`} (WIB)`} />
      <div className="flex gap-2">
        {PILIHAN.map((x) => (
          <Link key={x.kode} href={x.kode === 'hari-ini' ? '/kasir/riwayat' : `/kasir/riwayat?p=${x.kode}`}
            className={pilCls(kode === x.kode)}>{x.label}</Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat judul={<>Jumlah transaksi</>}>{jumlah}</Stat>
        <Stat judul={<>Total penjualan{terpotong ? ` (${baris.length} terbaru)` : ''}</>}>{formatRupiah(jumlahRupiah)}</Stat>
      </div>
      {terpotong && <p className="text-sm text-amber-700">Menampilkan {BATAS} transaksi terbaru dari {jumlah}. Persempit periode untuk melihat sisanya.</p>}
      <Table head={['No.', 'Waktu', 'Metode', 'Total', '']}>
        {baris.length === 0 && <BarisKosong colSpan={5}>Belum ada transaksi pada periode ini.</BarisKosong>}
        {baris.map((s) => (
          <tr key={s.id}>
            <td className="px-3 py-2 font-mono text-xs">#{s.nomor}</td>
            <td className="px-3 py-2">{waktu.format(new Date(s.created_at))}</td>
            <td className="px-3 py-2">{NAMA_METODE[s.metode]}</td>
            <td className="px-3 py-2 font-medium">{formatRupiah(Number(s.total))}</td>
            <td className="px-3 py-2"><Link href={`/kasir/riwayat/${s.id}`} className="text-brand-700 hover:underline">Struk</Link></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
