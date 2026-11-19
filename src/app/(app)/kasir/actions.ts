'use server'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { pesanGalat } from '@/lib/form'

export type InputBayar = {
  items: { product_id: string; qty: number }[]
  metode: 'tunai' | 'qris' | 'transfer'
  bayar: number
  key: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Galat dikembalikan sebagai data (bukan dilempar) agar UI dapat menampilkannya di banner.
export async function bayar(input: InputBayar): Promise<{ saleId?: string; error?: string }> {
  const profil = await getSessionProfile()
  if (!profil || (profil.peran !== 'kasir' && profil.peran !== 'pemilik')) return { error: 'Tidak diizinkan' }
  if (!Array.isArray(input?.items) || input.items.length === 0) return { error: 'Keranjang kosong' }
  if (!['tunai', 'qris', 'transfer'].includes(input.metode)) return { error: 'Metode pembayaran tidak valid' }
  if (!Number.isFinite(input.bayar) || input.bayar < 0) return { error: 'Jumlah bayar tidak valid' }
  if (!UUID.test(String(input.key))) return { error: 'Kunci transaksi tidak valid' }
  const items = input.items.map((i) => ({ product_id: String(i.product_id), qty: Number(i.qty) }))
  const supabase = await createClient()
  // Harga, HPP, FEFO, dan validasi stok ditegakkan di database (RPC checkout); harga dari klien tidak dipakai.
  const { data, error } = await supabase.rpc('checkout', { p_items: items, p_metode: input.metode, p_bayar: input.bayar, p_key: input.key })
  if (error) return { error: pesanGalat(error) }
  return { saleId: data as string }
}
