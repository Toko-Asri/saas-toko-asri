import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { kemajuanTier, labelTier, linkWhatsapp } from '@/lib/loyalty'
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Star } from 'lucide-react'
import { BarisKosong, LencanaTier, Table, btnGhostCls, btnWaCls } from '@/components/ui'
import { inisial } from '@/lib/nav'

const NAMA_METODE: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }
const waktu = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

type Riwayat = { sale_id: string; nomor: number; waktu: string; metode: string; total: number; poin: number; jumlah_item: number }
type Favorit = { product_id: string; nama: string; qty: number; total: number }

export default async function PelangganDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = await createClient()
  const profil = await getSessionProfile()
  const { data: c } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()
  const [r, f] = await Promise.all([
    supabase.rpc('riwayat_pelanggan', { p_customer: id, p_limit: 50 }),
    supabase.rpc('produk_favorit_pelanggan', { p_customer: id, p_limit: 5 }),
  ])
  const riwayat = ((r.data as Riwayat[] | null) ?? []).map((x) => ({ ...x, total: Number(x.total) }))
  const favorit = ((f.data as Favorit[] | null) ?? []).map((x) => ({ ...x, qty: Number(x.qty) }))
  const k = kemajuanTier(Number(c.total_belanja))
  const wa = linkWhatsapp(c.telepon, `Halo ${c.nama}, terima kasih sudah berbelanja di Toko Asri.`)
  const bisaBukaStruk = profil?.peran === 'pemilik'

  return (
    <div className="space-y-6">
      <Link href="/pelanggan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft aria-hidden className="size-4" />Semua pelanggan</Link>

      <section className="reveal flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-bold text-white shadow-md ring-4 ring-brand-50">{inisial(c.nama)}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-slate-900">{c.nama}</h1><LencanaTier tier={c.tier} />{!c.aktif && <span className="text-xs font-semibold text-slate-500">(nonaktif)</span>}</div>
            <p className="text-sm text-slate-500">Terdaftar {formatTanggal(c.tgl_daftar)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/pelanggan?edit=${c.id}`} className={btnGhostCls}><Pencil aria-hidden className="size-3.5" />Ubah data</Link>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={btnWaCls}>WhatsApp</a>}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="reveal rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800"><Star aria-hidden className="size-4" />Poin loyalitas</div>
          <div className="tabular mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{c.poin}<span className="ml-1 text-base font-semibold text-slate-500">poin</span></div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={k.persen} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan menuju tier berikutnya">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700" style={{ width: `${k.persen}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{k.berikutnya ? `${formatRupiah(k.kurang)} lagi menuju ${labelTier(k.berikutnya)}` : 'Tier tertinggi tercapai'}</p>
        </section>
        <section className="reveal rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card" style={{ '--i': 2 } as React.CSSProperties}>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Ringkasan belanja</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Total belanja</dt><dd className="tabular font-bold text-slate-900">{formatRupiah(Number(c.total_belanja))}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Jumlah transaksi</dt><dd className="tabular font-semibold">{c.jumlah_transaksi}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Belanja terakhir</dt><dd className="font-semibold">{c.terakhir_belanja ? formatTanggal(c.terakhir_belanja) : '–'}</dd></div>
          </dl>
        </section>
        <section className="reveal rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card" style={{ '--i': 3 } as React.CSSProperties}>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Kontak</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5"><Phone aria-hidden className="size-4 shrink-0 text-slate-400" /><dd className="tabular">{c.telepon ?? '–'}</dd></div>
            <div className="flex items-center gap-2.5"><Mail aria-hidden className="size-4 shrink-0 text-slate-400" /><dd className="break-all">{c.email ?? '–'}</dd></div>
            <div className="flex items-start gap-2.5"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" /><dd>{c.alamat ?? '–'}</dd></div>
            {c.catatan && <div className="rounded-lg bg-slate-50 p-2.5 text-slate-600">Catatan: {c.catatan}</div>}
          </dl>
        </section>
      </div>

      <h2 className="text-lg font-bold text-slate-900">Produk favorit</h2>
      <Table head={['Produk', 'Jumlah dibeli', 'Nilai']}>
        {favorit.length === 0 && <BarisKosong colSpan={3}>Belum ada pembelian.</BarisKosong>}
        {favorit.map((p) => (
          <tr key={p.product_id}><td className="px-3 py-2.5 font-medium text-slate-900">{p.nama}</td><td className="tabular px-3 py-2.5">{p.qty}</td><td className="tabular px-3 py-2.5">{formatRupiah(Number(p.total))}</td></tr>
        ))}
      </Table>

      <h2 className="text-lg font-bold text-slate-900">Riwayat belanja</h2>
      <Table head={['No.', 'Waktu', 'Metode', 'Item', 'Total', 'Poin', '']}>
        {riwayat.length === 0 && <BarisKosong colSpan={7}>Belum ada transaksi.</BarisKosong>}
        {riwayat.map((s) => (
          <tr key={s.sale_id}>
            <td className="px-3 py-2.5 font-mono text-xs">#{s.nomor}</td>
            <td className="px-3 py-2.5">{waktu.format(new Date(s.waktu))}</td>
            <td className="px-3 py-2.5">{NAMA_METODE[s.metode]}</td>
            <td className="tabular px-3 py-2.5">{s.jumlah_item}</td>
            <td className="tabular px-3 py-2.5 font-semibold">{formatRupiah(s.total)}</td>
            <td className="tabular px-3 py-2.5 font-semibold text-mint-700">+{s.poin}</td>
            <td className="px-3 py-2.5 text-right">{bisaBukaStruk && <Link href={`/kasir/riwayat/${s.sale_id}`} className="font-semibold text-brand-700 hover:underline">Struk</Link>}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
