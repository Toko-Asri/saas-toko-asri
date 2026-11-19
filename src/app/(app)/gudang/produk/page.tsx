import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { Banner, Card, Field, PageHeader, Table, btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { simpanProduk, ubahAktifProduk } from './actions'

type SP = { edit?: string; error?: string; ok?: string }

export default async function ProdukPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { edit, error, ok } = await searchParams
  const supabase = await createClient()
  const [{ data: produk }, { data: pemasok }] = await Promise.all([
    supabase.from('products').select('*, suppliers(nama)').order('nama'),
    supabase.from('suppliers').select('id, nama').eq('aktif', true).order('nama'),
  ])
  const p = produk?.find((x) => x.id === edit)
  return (
    <div className="space-y-4">
      <PageHeader title="Produk" subtitle="Master produk, harga, dan aturan pemesanan ulang" />
      <Banner error={error} ok={ok} />
      <Card>
        <form action={simpanProduk} key={p?.id ?? 'baru'} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" defaultValue={p?.id ?? ''} />
          <Field label="SKU *"><input name="sku" required defaultValue={p?.sku} className={inputCls} /></Field>
          <div className="sm:col-span-2"><Field label="Nama produk *"><input name="nama" required defaultValue={p?.nama} className={inputCls} /></Field></div>
          <Field label="Satuan"><input name="satuan" defaultValue={p?.satuan ?? 'pcs'} className={inputCls} /></Field>
          <Field label="Pemasok">
            <select name="supplier_id" defaultValue={p?.supplier_id ?? ''} className={inputCls}>
              <option value="">— belum ada —</option>
              {(pemasok ?? []).map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </Field>
          <Field label="Harga beli (Rp) *"><input name="harga_beli" type="number" min="0" step="1" required defaultValue={p?.harga_beli ?? 0} className={inputCls} /></Field>
          <Field label="Harga jual (Rp) *"><input name="harga_jual" type="number" min="0" step="1" required defaultValue={p?.harga_jual ?? 0} className={inputCls} /></Field>
          <Field label="Stok minimum *"><input name="min_stock" type="number" min="0" step="1" required defaultValue={p?.min_stock ?? 0} className={inputCls} /></Field>
          <Field label="Jumlah pesan ulang *"><input name="reorder_qty" type="number" min="1" step="1" required defaultValue={p?.reorder_qty ?? 1} className={inputCls} /></Field>
          <div className="flex gap-2 sm:col-span-4">
            <button className={btnCls}>{p ? 'Simpan perubahan' : 'Tambah produk'}</button>
            {p && <Link href="/gudang/produk" className={btnGhostCls + ' self-center'}>Batal</Link>}
          </div>
        </form>
      </Card>
      <Table head={['SKU', 'Produk', 'Pemasok', 'Harga beli', 'Harga jual', 'Min / Pesan ulang', 'Status', '']}>
        {(produk ?? []).map((x) => (
          <tr key={x.id} className={x.aktif ? '' : 'text-slate-400'}>
            <td className="px-3 py-2 font-mono text-xs">{x.sku}</td>
            <td className="px-3 py-2 font-medium">{x.nama}</td>
            <td className="px-3 py-2">{x.suppliers?.nama ?? '–'}</td>
            <td className="px-3 py-2">{formatRupiah(Number(x.harga_beli))}</td>
            <td className="px-3 py-2">{formatRupiah(Number(x.harga_jual))}</td>
            <td className="px-3 py-2">{x.min_stock} / {x.reorder_qty}</td>
            <td className="px-3 py-2">{x.aktif ? 'Aktif' : 'Nonaktif'}</td>
            <td className="flex gap-2 px-3 py-2">
              <Link href={`/gudang/produk?edit=${x.id}`} className={btnGhostCls}>Ubah</Link>
              <form action={ubahAktifProduk}>
                <input type="hidden" name="id" value={x.id} /><input type="hidden" name="aktif" value={String(!x.aktif)} />
                <button className={btnGhostCls}>{x.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
