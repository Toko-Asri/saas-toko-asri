import { createClient } from '@/lib/supabase/server'
import { formatTanggal } from '@/lib/format'
import { Banner, PageHeader, Table, btnCls, btnGhostCls } from '@/components/ui'
import { abaikanSaran, buatPoDariSaran } from './actions'

export default async function SaranPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: saran } = await supabase
    .from('purchase_suggestions')
    .select('id, qty_disarankan, created_at, product_id, products(nama, sku, satuan, min_stock, suppliers(nama))')
    .eq('status', 'terbuka').order('created_at')
  const ids = (saran ?? []).map((s) => s.product_id)
  const { data: batch } = ids.length
    ? await supabase.from('batches').select('product_id, qty').in('product_id', ids)
    : { data: [] as { product_id: string; qty: number }[] }
  const stok = new Map<string, number>()
  for (const b of batch ?? []) stok.set(b.product_id, (stok.get(b.product_id) ?? 0) + b.qty)

  return (
    <div className="space-y-4">
      <PageHeader title="Saran Pembelian" subtitle="Produk yang stoknya sudah mencapai atau di bawah minimum. Dibuat otomatis oleh sistem." />
      <Banner error={error} ok={ok} />
      <Table head={['Produk', 'Pemasok', 'Stok saat ini', 'Minimum', 'Disarankan pesan', 'Sejak', '']}>
        {(saran ?? []).length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Tidak ada saran: semua stok di atas minimum.</td></tr>}
        {(saran ?? []).map((s) => {
          const p = s.products as unknown as { nama: string; satuan: string; min_stock: number; suppliers: { nama: string } | null }
          return (
            <tr key={s.id}>
              <td className="px-3 py-2 font-medium">{p.nama}</td>
              <td className="px-3 py-2">{p.suppliers?.nama ?? <span className="text-red-600">Belum ada pemasok</span>}</td>
              <td className="px-3 py-2">{stok.get(s.product_id) ?? 0} {p.satuan}</td>
              <td className="px-3 py-2">{p.min_stock}</td>
              <td className="px-3 py-2 font-semibold">{s.qty_disarankan} {p.satuan}</td>
              <td className="px-3 py-2">{formatTanggal(s.created_at)}</td>
              <td className="flex gap-2 px-3 py-2">
                <form action={buatPoDariSaran}><input type="hidden" name="id" value={s.id} /><button className={btnCls} disabled={!p.suppliers}>Buat PO</button></form>
                <form action={abaikanSaran}><input type="hidden" name="id" value={s.id} /><button className={btnGhostCls}>Abaikan</button></form>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
