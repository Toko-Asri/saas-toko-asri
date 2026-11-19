import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import type { PelangganPos } from './actions'
import { Pos, type ProdukPos } from './pos'

export default async function KasirPage() {
  const supabase = await createClient()
  const [{ data: produk }, { data: stok }, { data: pelanggan }] = await Promise.all([
    supabase.from('products').select('id, sku, nama, satuan, harga_jual').eq('aktif', true).order('nama'),
    supabase.from('stok_layak').select('product_id, stok'),
    supabase.from('customers').select('id, nama, telepon, tier, poin').eq('aktif', true).order('nama').limit(1000),
  ])
  const peta = new Map<string, number>((stok ?? []).map((s) => [s.product_id as string, Number(s.stok)]))
  const daftar: ProdukPos[] = (produk ?? []).map((p) => ({
    id: p.id, sku: p.sku, nama: p.nama, satuan: p.satuan, harga: Number(p.harga_jual), stokLayak: peta.get(p.id) ?? 0,
  }))
  return (
    <div className="space-y-4">
      <PageHeader title="Kasir" subtitle="Pilih produk, atur jumlah, lalu bayar. Stok diambil otomatis dari batch yang paling dulu kedaluwarsa." />
      <Pos produk={daftar} pelanggan={(pelanggan ?? []) as PelangganPos[]} />
    </div>
  )
}
