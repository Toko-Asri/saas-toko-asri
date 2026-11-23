import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Badge, Banner, Card, PageHeader, Table, btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { terimaBarang, ubahStatusPo } from '../actions'
import { STATUS_PO } from '@/lib/po-status'

export default async function PoDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const { data: po } = await supabase.from('purchase_orders')
    .select('id, status, created_at, suppliers(nama, telepon), purchase_order_items(id, qty_pesan, qty_diterima, harga_beli, products(nama, sku, satuan))')
    .eq('id', id).maybeSingle()
  if (!po) notFound()
  const { data: lokasi } = await supabase.from('storage_locations').select('id, nama, tipe, suhu_min, suhu_maks').order('nama')
  const items = (po.purchase_order_items as unknown as { id: string; qty_pesan: number; qty_diterima: number; harga_beli: number; products: { nama: string; sku: string; satuan: string } }[])
  const total = items.reduce((a, i) => a + i.qty_pesan * Number(i.harga_beli), 0)
  const st = STATUS_PO[po.status]
  const sup = po.suppliers as unknown as { nama: string; telepon: string | null }
  const adaTerima = items.some((i) => i.qty_diterima > 0)

  return (
    <div className="space-y-4">
      <Link href="/gudang/pembelian" className="text-sm text-brand-700 hover:underline">← Semua PO</Link>
      <PageHeader title={`PO ${sup.nama}`} subtitle={`Dibuat ${formatTanggal(po.created_at)} · Total ${formatRupiah(total)}${sup.telepon ? ' · Telp ' + sup.telepon : ''}`} />
      <Banner error={error} ok={ok} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge nada={st.nada}>{st.teks}</Badge>
        {po.status === 'draft' && (
          <form action={ubahStatusPo}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="status" value="dipesan" /><button className={btnCls}>Tandai sudah dipesan</button></form>
        )}
        {(po.status === 'draft' || po.status === 'dipesan') && !adaTerima && (
          <form action={ubahStatusPo}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="status" value="dibatalkan" /><button className={btnGhostCls}>Batalkan PO</button></form>
        )}
      </div>

      {po.status === 'dipesan' ? (
        <form action={terimaBarang} className="space-y-3">
          <input type="hidden" name="po_id" value={po.id} />
          <Card><p className="text-sm text-slate-600">Isi jumlah pada item yang diterima. Setiap penerimaan membentuk batch baru; kode batch, lokasi, dan tanggal kedaluwarsa wajib. Boleh menerima sebagian.</p></Card>
          <Table head={['Produk', 'Dipesan', 'Sudah diterima', 'Diterima sekarang', 'Kode batch', 'Lokasi simpan', 'Kedaluwarsa']}>
            {items.map((i) => {
              const sisa = i.qty_pesan - i.qty_diterima
              return (
                <tr key={i.id}>
                  <td className="px-3 py-2"><div className="font-medium">{i.products.nama}</div><div className="text-xs text-slate-500">{i.products.sku}</div></td>
                  <td className="px-3 py-2">{i.qty_pesan} {i.products.satuan}</td>
                  <td className="px-3 py-2">{i.qty_diterima}</td>
                  {sisa > 0 ? (<>
                    <td className="px-3 py-2"><input type="hidden" name="item_id" value={i.id} /><input name={`qty_${i.id}`} type="number" min="0" max={sisa} step="1" placeholder={`maks ${sisa}`} className={inputCls + ' w-28'} /></td>
                    <td className="px-3 py-2"><input name={`kode_${i.id}`} className={inputCls + ' w-32'} /></td>
                    <td className="px-3 py-2">
                      <select name={`lokasi_${i.id}`} className={inputCls}>
                        {(lokasi ?? []).map((l) => <option key={l.id} value={l.id}>{l.nama} ({l.suhu_min ?? '–'}/{l.suhu_maks ?? '–'}°C)</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input name={`exp_${i.id}`} type="date" className={inputCls} /></td>
                  </>) : <td colSpan={4} className="px-3 py-2 text-emerald-700">Lengkap</td>}
                </tr>
              )
            })}
          </Table>
          <button className={btnCls}>Catat penerimaan barang</button>
        </form>
      ) : (
        <Table head={['Produk', 'Dipesan', 'Diterima', 'Harga beli', 'Subtotal']}>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="px-3 py-2 font-medium">{i.products.nama}</td>
              <td className="px-3 py-2">{i.qty_pesan} {i.products.satuan}</td>
              <td className="px-3 py-2">{i.qty_diterima}</td>
              <td className="px-3 py-2">{formatRupiah(Number(i.harga_beli))}</td>
              <td className="px-3 py-2">{formatRupiah(i.qty_pesan * Number(i.harga_beli))}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
