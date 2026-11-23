import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { rentangPeriode } from '@/lib/periode'
import { Banner, BarisKosong, Stat, Table, btnCls } from '@/components/ui'

const waktu = new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', timeZone: 'Asia/Jakarta' })
const NAMA_METODE: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }

// Beranda kasir: hanya penjualan MILIK kasir hari ini (dibatasi RLS). Tanpa laba, HPP, biaya, atau data agregat pelanggan.
export async function BerandaKasir({ nama }: { nama: string }) {
  const supabase = await createClient()
  const { dari } = rentangPeriode('hari-ini')
  const [y, m, d] = dari.split('-').map(Number)
  const besok = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  const { data, error } = await supabase.from('sales').select('id, nomor, total, metode, created_at')
    .gte('created_at', `${dari}T00:00:00+07:00`).lt('created_at', `${besok}T00:00:00+07:00`)
    .order('created_at', { ascending: false }).limit(500)
  const baris = data ?? []
  const total = baris.reduce((a, s) => a + Number(s.total), 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Halo, {nama}</h1>
        <p className="text-sm text-slate-500">Penjualan Anda hari ini</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/kasir" className={btnCls + ' px-6 py-3 text-base'}>Mulai transaksi</Link>
        <Link href="/pelanggan" className="rounded border bg-white px-6 py-3 text-base hover:bg-slate-50">Cari pelanggan</Link>
      </div>
      <Banner error={error?.message} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat judul={<>Transaksi hari ini</>}>{baris.length}</Stat>
        <Stat judul={<>Total penjualan hari ini</>}>{formatRupiah(total)}</Stat>
      </div>
      <h2 className="text-lg font-semibold">Transaksi terakhir</h2>
      <Table head={['No.', 'Jam (WIB)', 'Metode', 'Total', '']}>
        {baris.length === 0 && <BarisKosong colSpan={5}>Belum ada transaksi hari ini.</BarisKosong>}
        {baris.slice(0, 5).map((s) => (
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
