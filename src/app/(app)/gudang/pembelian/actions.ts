'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseItemsPo } from '@/lib/po-items'
import { kembali, pesanGalat, str } from '@/lib/form'

export async function buatPo(fd: FormData) {
  await assertGudang()
  const supplier = str(fd, 'supplier_id')
  const hasil = parseItemsPo(fd)
  if (hasil.error) kembali(`/gudang/pembelian/baru?supplier=${supplier}`, { error: hasil.error })
  const items = hasil.items ?? []
  if (!supplier) kembali('/gudang/pembelian/baru', { error: 'Pilih pemasok terlebih dahulu' })
  if (items.length === 0) kembali(`/gudang/pembelian/baru?supplier=${supplier}`, { error: 'Isi jumlah pesan minimal untuk satu produk' })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_po', { p_supplier: supplier, p_items: items })
  if (error) kembali(`/gudang/pembelian/baru?supplier=${supplier}`, { error: pesanGalat(error) })
  revalidatePath('/gudang/pembelian')
  redirect(`/gudang/pembelian/${data}?ok=${encodeURIComponent('PO draft dibuat')}`)
}

export async function ubahStatusPo(fd: FormData) {
  await assertGudang()
  const id = str(fd, 'id')
  const ke = str(fd, 'status')
  const path = `/gudang/pembelian/${id}`
  const supabase = await createClient()
  // Aturan transisi status ditegakkan di database (RPC set_po_status).
  const { error } = await supabase.rpc('set_po_status', { p_po: id, p_status: ke })
  if (error) kembali(path, { error: pesanGalat(error) })
  revalidatePath(path)
  revalidatePath('/gudang/pembelian')
  kembali(path, { ok: ke === 'dipesan' ? 'PO ditandai sudah dipesan ke pemasok' : 'PO dibatalkan' })
}

export async function terimaBarang(fd: FormData) {
  await assertGudang()
  const poId = str(fd, 'po_id')
  const path = `/gudang/pembelian/${poId}`
  const items: { item_id: string; qty: number; location_id: string; kode_batch: string; tgl_kedaluwarsa: string }[] = []
  for (const itemId of fd.getAll('item_id').map(String)) {
    const raw = str(fd, 'qty_' + itemId)
    if (raw === '' || Number(raw) === 0) continue
    const qty = Number(raw)
    const kode = str(fd, 'kode_' + itemId)
    const exp = str(fd, 'exp_' + itemId)
    const lokasi = str(fd, 'lokasi_' + itemId)
    if (!Number.isInteger(qty) || qty < 0) kembali(path, { error: 'Jumlah diterima harus bilangan bulat positif' })
    if (!kode || !exp || !lokasi) kembali(path, { error: 'Kode batch, tanggal kedaluwarsa, dan lokasi wajib diisi untuk item yang diterima' })
    items.push({ item_id: itemId, qty, location_id: lokasi, kode_batch: kode, tgl_kedaluwarsa: exp })
  }
  if (items.length === 0) kembali(path, { error: 'Isi jumlah diterima minimal untuk satu item' })
  const supabase = await createClient()
  const { error } = await supabase.rpc('receive_goods', { p_po: poId, p_items: items })
  if (error) kembali(path, { error: pesanGalat(error) })
  revalidatePath(path)
  revalidatePath('/gudang/inventori')
  kembali(path, { ok: 'Penerimaan barang dicatat dan stok bertambah' })
}
