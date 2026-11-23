import Link from 'next/link'
import { ArrowRight, Receipt, Search, ShoppingCart, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { rentangPeriode } from '@/lib/periode'
import { Banner, BarisKosong, KpiCard, Table } from '@/components/ui'

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
    <div className="space-y-6">
      <section className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 p-6 text-white shadow-pop md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-400/20 blur-3xl" />
        <p className="text-sm font-medium text-brand-200">Selamat bekerja</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Halo, {nama}</h1>
        <p className="mt-1 text-sm text-slate-300">Ringkasan penjualan Anda hari ini.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/kasir" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-7 text-base font-bold text-brand-800 shadow-lg transition hover:-translate-y-0.5 hover:shadow-pop active:scale-[0.98]">
            <ShoppingCart aria-hidden className="size-5" />Mulai transaksi<ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link href="/pelanggan" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]">
            <Search aria-hidden className="size-5" />Cari pelanggan
          </Link>
        </div>
      </section>

      <Banner error={error?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard indeks={1} judul="Transaksi hari ini" nilai={String(baris.length)} ikon={<Receipt className="size-5" />} />
        <KpiCard indeks={2} judul="Total penjualan hari ini" nilai={formatRupiah(total)} ikon={<Wallet className="size-5" />} nada="sukses" />
      </div>

      <h2 className="text-lg font-bold text-slate-900">Transaksi terakhir</h2>
      <Table head={['No.', 'Jam (WIB)', 'Metode', 'Total', '']}>
        {baris.length === 0 && <BarisKosong colSpan={5}>Belum ada transaksi hari ini.</BarisKosong>}
        {baris.slice(0, 5).map((s) => (
          <tr key={s.id}>
            <td className="px-3 py-2.5 font-mono text-xs">#{s.nomor}</td>
            <td className="px-3 py-2.5">{waktu.format(new Date(s.created_at))}</td>
            <td className="px-3 py-2.5">{NAMA_METODE[s.metode]}</td>
            <td className="tabular px-3 py-2.5 font-semibold">{formatRupiah(Number(s.total))}</td>
            <td className="px-3 py-2.5 text-right"><Link href={`/kasir/riwayat/${s.id}`} className="font-semibold text-brand-700 hover:underline">Struk</Link></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
