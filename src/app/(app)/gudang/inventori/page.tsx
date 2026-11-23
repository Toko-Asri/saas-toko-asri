import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { expiryStatus, hariIniJakarta, type StatusKedaluwarsa } from '@/lib/expiry'
import { formatTanggal } from '@/lib/format'
import { Badge, BarisKosong, PageHeader, Stat, Table, pilCls } from '@/components/ui'

type Filter = 'semua' | 'hampir' | 'kedaluwarsa'
const LENCANA: Record<StatusKedaluwarsa, { teks: string; nada: 'bahaya' | 'peringatan' | 'sukses' }> = {
  kedaluwarsa: { teks: 'Kedaluwarsa', nada: 'bahaya' },
  hampir: { teks: 'Hampir kedaluwarsa', nada: 'peringatan' },
  aman: { teks: 'Aman', nada: 'sukses' },
}

export default async function InventoriPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams
  const filter: Filter = f === 'hampir' || f === 'kedaluwarsa' ? f : 'semua'
  const supabase = await createClient()
  const [{ data: produk }, { data: batch }] = await Promise.all([
    supabase.from('products').select('id, sku, nama, satuan, min_stock, aktif').order('nama'),
    supabase.from('batches').select('id, product_id, kode_batch, qty, tgl_kedaluwarsa, products(nama, sku, satuan), storage_locations(nama, tipe, suhu_min, suhu_maks)')
      .gt('qty', 0).order('tgl_kedaluwarsa', { ascending: true }),
  ])
  const hariIni = hariIniJakarta()
  const semuaBatch = (batch ?? []).map((b) => ({ ...b, status: expiryStatus(b.tgl_kedaluwarsa, hariIni) }))
  const tampil = semuaBatch.filter((b) => filter === 'semua' || b.status === filter)

  const stok = new Map<string, { total: number; layak: number }>()
  for (const b of semuaBatch) {
    const s = stok.get(b.product_id) ?? { total: 0, layak: 0 }
    s.total += b.qty
    if (b.status !== 'kedaluwarsa') s.layak += b.qty
    stok.set(b.product_id, s)
  }
  const jumlah = (s: StatusKedaluwarsa) => semuaBatch.filter((b) => b.status === s).length

  return (
    <div className="space-y-4">
      <PageHeader title="Inventori" subtitle="Stok per produk dan per batch, urut kedaluwarsa terdekat (FEFO)" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat judul={<>Batch aktif</>}>{semuaBatch.length}</Stat>
        <Stat judul={<>Hampir kedaluwarsa (≤14 hari)</>} nada="peringatan">{jumlah('hampir')}</Stat>
        <Stat judul={<>Sudah kedaluwarsa</>} nada="bahaya">{jumlah('kedaluwarsa')}</Stat>
      </div>

      <h2 className="text-lg font-semibold">Stok per produk</h2>
      <Table head={['SKU', 'Produk', 'Stok layak jual', 'Total (termasuk kedaluwarsa)', 'Minimum', '']}>
        {(produk ?? []).filter((p) => p.aktif).map((p) => {
          const s = stok.get(p.id) ?? { total: 0, layak: 0 }
          const rendah = s.total <= p.min_stock
          return (
            <tr key={p.id}>
              <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
              <td className="px-3 py-2 font-medium">{p.nama}</td>
              <td className="px-3 py-2">{s.layak} {p.satuan}</td>
              <td className="px-3 py-2">{s.total}</td>
              <td className="px-3 py-2">{p.min_stock}</td>
              <td className="px-3 py-2">{rendah && <Badge nada="peringatan">Di bawah minimum</Badge>}</td>
            </tr>
          )
        })}
      </Table>

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Batch</h2>
        {(['semua', 'hampir', 'kedaluwarsa'] as Filter[]).map((x) => (
          <Link key={x} href={x === 'semua' ? '/gudang/inventori' : `/gudang/inventori?f=${x}`}
            className={pilCls(filter === x)}>
            {x === 'semua' ? 'Semua' : x === 'hampir' ? 'Hampir kedaluwarsa' : 'Kedaluwarsa'}
          </Link>
        ))}
      </div>
      <Table head={['Produk', 'Kode batch', 'Qty', 'Lokasi (suhu)', 'Kedaluwarsa', 'Status']}>
        {tampil.length === 0 && <BarisKosong colSpan={6}>Tidak ada batch pada filter ini.</BarisKosong>}
        {tampil.map((b) => {
          const prod = b.products as unknown as { nama: string; satuan: string } | null
          const lok = b.storage_locations as unknown as { nama: string; suhu_min: number | null; suhu_maks: number | null } | null
          return (
            <tr key={b.id}>
              <td className="px-3 py-2 font-medium">{prod?.nama}</td>
              <td className="px-3 py-2 font-mono text-xs">{b.kode_batch}</td>
              <td className="px-3 py-2">{b.qty} {prod?.satuan}</td>
              <td className="px-3 py-2">{lok?.nama} ({lok?.suhu_min ?? '–'} s/d {lok?.suhu_maks ?? '–'} °C)</td>
              <td className="px-3 py-2">{formatTanggal(b.tgl_kedaluwarsa)}</td>
              <td className="px-3 py-2"><Badge nada={LENCANA[b.status].nada}>{LENCANA[b.status].teks}</Badge></td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
