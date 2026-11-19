import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { TombolCetak } from './cetak'

const NAMA_METODE: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }
const waktu = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export default async function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: sale } = await supabase.from('sales').select('id, nomor, kasir_id, metode, total, bayar, kembalian, created_at').eq('id', id).maybeSingle()
  if (!sale) notFound()
  const [{ data: items }, { data: kasir }] = await Promise.all([
    supabase.from('sale_items').select('product_id, qty, harga_jual, products(nama)').eq('sale_id', id),
    sale.kasir_id ? supabase.from('profiles').select('nama').eq('id', sale.kasir_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  // satu produk bisa terambil dari beberapa batch: gabungkan per produk + harga
  const baris = new Map<string, { nama: string; qty: number; harga: number }>()
  for (const i of items ?? []) {
    const kunci = `${i.product_id}|${i.harga_jual}`
    const nama = (i.products as unknown as { nama: string } | null)?.nama ?? 'Produk'
    const b = baris.get(kunci) ?? { nama, qty: 0, harga: Number(i.harga_jual) }
    b.qty += i.qty
    baris.set(kunci, b)
  }
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/kasir" className="text-sm text-sky-700 hover:underline">← Transaksi baru</Link>
        <Link href="/kasir/riwayat" className="text-sm text-sky-700 hover:underline">Riwayat</Link>
      </div>
      <div className="space-y-3 rounded-lg border bg-white p-5 text-sm shadow-sm print:border-0 print:shadow-none">
        <div className="text-center">
          <div className="text-lg font-bold">Toko Asri</div>
          <div className="text-slate-500">Frozen food</div>
        </div>
        <div className="border-y border-dashed py-2 text-slate-600">
          <div>No. #{sale.nomor}</div>
          <div>{waktu.format(new Date(sale.created_at))} WIB</div>
          {kasir?.nama && <div>Kasir: {kasir.nama}</div>}
        </div>
        <table className="w-full">
          <tbody>
            {[...baris.values()].map((b, n) => (
              <tr key={n}><td className="py-1">{b.nama}<div className="text-xs text-slate-500">{b.qty} × {formatRupiah(b.harga)}</div></td><td className="py-1 text-right align-top">{formatRupiah(b.qty * b.harga)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-dashed pt-2">
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatRupiah(Number(sale.total))}</span></div>
          <div className="flex justify-between"><span>{NAMA_METODE[sale.metode]}</span><span>{formatRupiah(Number(sale.bayar))}</span></div>
          <div className="flex justify-between"><span>Kembalian</span><span>{formatRupiah(Number(sale.kembalian))}</span></div>
        </div>
        <p className="pt-2 text-center text-xs text-slate-500">Terima kasih sudah berbelanja!</p>
      </div>
      <TombolCetak />
    </div>
  )
}
