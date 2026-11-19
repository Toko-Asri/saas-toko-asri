import { createClient } from '@/lib/supabase/server'
import { Banner, Card, Field, PageHeader, Table, btnCls, inputCls } from '@/components/ui'
import { buatPo } from '../actions'

export default async function PoBaruPage({ searchParams }: { searchParams: Promise<{ supplier?: string; error?: string }> }) {
  const { supplier, error } = await searchParams
  const supabase = await createClient()
  const { data: pemasok } = await supabase.from('suppliers').select('id, nama').eq('aktif', true).order('nama')
  const { data: produk } = supplier
    ? await supabase.from('products').select('id, sku, nama, satuan, harga_beli, reorder_qty').eq('supplier_id', supplier).eq('aktif', true).order('nama')
    : { data: [] }
  return (
    <div className="space-y-4">
      <PageHeader title="PO Baru" subtitle="Pilih pemasok, lalu isi jumlah untuk produk yang dipesan" />
      <Banner error={error} />
      <Card>
        <form className="flex items-end gap-3">
          <Field label="Pemasok">
            <select name="supplier" defaultValue={supplier ?? ''} className={inputCls}>
              <option value="">— pilih —</option>
              {(pemasok ?? []).map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </Field>
          <button className={btnCls}>Tampilkan produk</button>
        </form>
      </Card>
      {supplier && (
        <form action={buatPo} className="space-y-3">
          <input type="hidden" name="supplier_id" value={supplier} />
          {(produk ?? []).length === 0 ? <p className="text-slate-500">Pemasok ini belum punya produk aktif.</p> : (
            <Table head={['Produk', 'Harga beli (Rp)', 'Jumlah pesan']}>
              {(produk ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2"><div className="font-medium">{p.nama}</div><div className="text-xs text-slate-500">{p.sku} · saran pesan ulang {p.reorder_qty} {p.satuan}</div></td>
                  <td className="px-3 py-2"><input name={`harga_${p.id}`} type="number" min="0" step="1" defaultValue={Number(p.harga_beli)} className={inputCls + ' w-32'} /></td>
                  <td className="px-3 py-2"><input name={`qty_${p.id}`} type="number" min="0" step="1" placeholder="0" className={inputCls + ' w-28'} /></td>
                </tr>
              ))}
            </Table>
          )}
          <button className={btnCls}>Buat PO draft</button>
        </form>
      )}
    </div>
  )
}
