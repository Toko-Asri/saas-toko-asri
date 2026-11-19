'use server'
import { revalidatePath } from 'next/cache'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { kembali, num, pesanGalat, str } from '../_lib'

const PATH = '/gudang/produk'

export async function simpanProduk(fd: FormData) {
  await assertGudang()
  const id = str(fd, 'id')
  const sku = str(fd, 'sku')
  const nama = str(fd, 'nama')
  const hargaBeli = num(fd, 'harga_beli')
  const hargaJual = num(fd, 'harga_jual')
  const minStock = num(fd, 'min_stock')
  const reorderQty = num(fd, 'reorder_qty')
  if (!sku || !nama) kembali(PATH, { error: 'SKU dan nama produk wajib diisi' })
  if (!(hargaBeli >= 0) || !(hargaJual >= 0)) kembali(PATH, { error: 'Harga beli dan harga jual harus berupa angka ≥ 0' })
  if (!Number.isInteger(minStock) || minStock < 0) kembali(PATH, { error: 'Stok minimum harus bilangan bulat ≥ 0' })
  if (!Number.isInteger(reorderQty) || reorderQty < 1) kembali(PATH, { error: 'Jumlah pesan ulang harus bilangan bulat ≥ 1' })
  const data = {
    sku, nama, satuan: str(fd, 'satuan') || 'pcs', supplier_id: str(fd, 'supplier_id') || null,
    harga_beli: hargaBeli, harga_jual: hargaJual, min_stock: minStock, reorder_qty: reorderQty,
  }
  const supabase = await createClient()
  const { error } = id ? await supabase.from('products').update(data).eq('id', id) : await supabase.from('products').insert(data)
  if (error) kembali(PATH, { error: error.code === '23505' ? 'SKU sudah digunakan produk lain' : pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Produk disimpan' })
}

export async function ubahAktifProduk(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { error } = await supabase.from('products').update({ aktif: str(fd, 'aktif') === 'true' }).eq('id', str(fd, 'id'))
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Status produk diubah' })
}
