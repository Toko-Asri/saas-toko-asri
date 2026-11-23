import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { ArrowLeft, CircleCheck, History } from 'lucide-react'
import { TombolCetak } from './cetak'
import { Logo } from '@/components/logo'

const NAMA_METODE: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }
const waktu = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export default async function StrukPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ baru?: string }> }) {
  const { id } = await params
  const { baru } = await searchParams
  const supabase = await createClient()
  const { data: sale } = await supabase.from('sales').select('id, nomor, kasir_id, customer_id, poin, metode, total, bayar, kembalian, created_at').eq('id', id).maybeSingle()
  if (!sale) notFound()
  const [{ data: items }, { data: kasir }, { data: pelanggan }] = await Promise.all([
    supabase.from('sale_items').select('product_id, qty, harga_jual, products(nama)').eq('sale_id', id),
    sale.kasir_id ? supabase.from('profiles').select('nama').eq('id', sale.kasir_id).maybeSingle() : Promise.resolve({ data: null }),
    sale.customer_id ? supabase.from('customers').select('nama, tier, poin').eq('id', sale.customer_id).maybeSingle() : Promise.resolve({ data: null }),
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
  const tier = pelanggan ? ({ reguler: 'Reguler', silver: 'Silver', gold: 'Gold' } as Record<string, string>)[pelanggan.tier] : null
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="no-print flex items-center justify-between text-sm">
        <Link href="/kasir" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"><ArrowLeft aria-hidden className="size-4" />Transaksi baru</Link>
        <Link href="/kasir/riwayat" className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-brand-700"><History aria-hidden className="size-4" />Riwayat</Link>
      </div>
      {baru === '1' && (
        <div className="no-print flex items-center gap-3 rounded-2xl border border-mint-100 bg-mint-50 px-4 py-3 text-mint-700 animate-fade-in">
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          <div className="text-sm"><b>Transaksi #{sale.nomor} tercatat.</b> Struk siap dicetak.</div>
        </div>
      )}

      <article className="struk relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 text-sm shadow-pop print:p-0">
        <div className="mb-4 flex justify-center print:hidden"><Logo ukuran={36} /></div>
        {/* Saat dicetak, latar gradien logo tidak ikut tercetak: pakai nama toko berupa teks */}
        <div className="mb-2 hidden text-center print:block"><div className="text-lg font-extrabold">Toko Asri</div><div className="text-[10px] uppercase tracking-[0.2em]">Frozen food</div></div>
        <div className="space-y-0.5 border-y border-dashed border-slate-300 py-3 text-slate-600">
          <div className="flex justify-between"><span>No.</span><span className="tabular font-semibold text-slate-900">#{sale.nomor}</span></div>
          <div className="flex justify-between"><span>Waktu</span><span>{waktu.format(new Date(sale.created_at))} WIB</span></div>
          {kasir?.nama && <div className="flex justify-between"><span>Kasir</span><span>{kasir.nama}</span></div>}
          {pelanggan && <div className="flex justify-between"><span>Pelanggan</span><span className="text-right">{pelanggan.nama} ({tier})</span></div>}
        </div>
        <table className="my-3 w-full">
          <tbody>
            {[...baris.values()].map((b, n) => (
              <tr key={n} className="align-top">
                <td className="py-1.5 pr-3"><div className="font-medium text-slate-900">{b.nama}</div><div className="tabular text-xs text-slate-500">{b.qty} × {formatRupiah(b.harga)}</div></td>
                <td className="tabular py-1.5 text-right font-medium text-slate-900">{formatRupiah(b.qty * b.harga)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-dashed border-slate-300 pt-3">
          <div className="flex items-baseline justify-between text-base font-extrabold text-slate-900"><span>Total</span><span className="tabular">{formatRupiah(Number(sale.total))}</span></div>
          <div className="flex justify-between text-slate-600"><span>{NAMA_METODE[sale.metode]}</span><span className="tabular">{formatRupiah(Number(sale.bayar))}</span></div>
          <div className="flex justify-between text-slate-600"><span>Kembalian</span><span className="tabular">{formatRupiah(Number(sale.kembalian))}</span></div>
          {pelanggan && (
            <div className="mt-2 space-y-1 border-t border-dashed border-slate-300 pt-2 text-slate-600">
              <div className="flex justify-between"><span>Poin didapat</span><span className="tabular font-semibold text-mint-700 print:text-black">+{sale.poin}</span></div>
              <div className="flex justify-between"><span>Total poin saat ini</span><span className="tabular">{pelanggan.poin}</span></div>
            </div>
          )}
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">Terima kasih sudah berbelanja!<br />Toko Asri · Fresh Quality, Frozen Convenience</p>
      </article>
      <TombolCetak />
    </div>
  )
}
