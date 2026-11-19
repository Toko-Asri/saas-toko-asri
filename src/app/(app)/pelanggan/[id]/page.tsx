import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { kemajuanTier, labelTier, linkWhatsapp } from '@/lib/loyalty'
import { Card, LencanaTier, PageHeader, Table } from '@/components/ui'

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
    <div className="space-y-4">
      <Link href="/pelanggan" className="text-sm text-sky-700 hover:underline">← Semua pelanggan</Link>
      <PageHeader title={c.nama} subtitle={`Terdaftar ${formatTanggal(c.tgl_daftar)}${c.aktif ? '' : ' · nonaktif'}`} />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <div className="mb-2 flex items-center gap-2"><LencanaTier tier={c.tier} /><span className="text-2xl font-bold">{c.poin} poin</span></div>
          <div className="h-2 overflow-hidden rounded bg-slate-200" role="progressbar" aria-valuenow={k.persen} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-sky-600" style={{ width: `${k.persen}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {k.berikutnya ? `${formatRupiah(k.kurang)} lagi menuju ${labelTier(k.berikutnya)}` : 'Tier tertinggi tercapai'}
          </p>
        </Card>
        <Card>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Total belanja</dt><dd className="font-semibold">{formatRupiah(Number(c.total_belanja))}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Jumlah transaksi</dt><dd>{c.jumlah_transaksi}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Belanja terakhir</dt><dd>{c.terakhir_belanja ? formatTanggal(c.terakhir_belanja) : '–'}</dd></div>
          </dl>
        </Card>
        <Card>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Telepon</dt><dd>{c.telepon ?? '–'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{c.email ?? '–'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Alamat</dt><dd className="text-right">{c.alamat ?? '–'}</dd></div>
            {c.catatan && <div className="pt-1 text-slate-600">Catatan: {c.catatan}</div>}
          </dl>
          <div className="mt-3 flex gap-2">
            <Link href={`/pelanggan?edit=${c.id}`} className="rounded border px-3 py-1 text-xs hover:bg-slate-50">Ubah data</Link>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded border px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50">WhatsApp</a>}
          </div>
        </Card>
      </div>

      <h2 className="text-lg font-semibold">Produk favorit</h2>
      <Table head={['Produk', 'Jumlah dibeli', 'Nilai']}>
        {favorit.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Belum ada pembelian.</td></tr>}
        {favorit.map((p) => (
          <tr key={p.product_id}><td className="px-3 py-2 font-medium">{p.nama}</td><td className="px-3 py-2">{p.qty}</td><td className="px-3 py-2">{formatRupiah(Number(p.total))}</td></tr>
        ))}
      </Table>

      <h2 className="text-lg font-semibold">Riwayat belanja</h2>
      <Table head={['No.', 'Waktu', 'Metode', 'Item', 'Total', 'Poin', '']}>
        {riwayat.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Belum ada transaksi.</td></tr>}
        {riwayat.map((s) => (
          <tr key={s.sale_id}>
            <td className="px-3 py-2 font-mono text-xs">#{s.nomor}</td>
            <td className="px-3 py-2">{waktu.format(new Date(s.waktu))}</td>
            <td className="px-3 py-2">{NAMA_METODE[s.metode]}</td>
            <td className="px-3 py-2">{s.jumlah_item}</td>
            <td className="px-3 py-2 font-medium">{formatRupiah(s.total)}</td>
            <td className="px-3 py-2">+{s.poin}</td>
            <td className="px-3 py-2">{bisaBukaStruk && <Link href={`/kasir/riwayat/${s.sale_id}`} className="text-sky-700 hover:underline">Struk</Link>}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
