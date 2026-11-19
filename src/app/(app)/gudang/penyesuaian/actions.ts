'use server'
import { revalidatePath } from 'next/cache'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { kembali, num, pesanGalat, str } from '../_lib'

const PATH = '/gudang/penyesuaian'
const ALASAN = ['rusak', 'kedaluwarsa', 'hilang', 'koreksi']

export async function sesuaikanStok(fd: FormData) {
  await assertGudang()
  const batchId = str(fd, 'batch_id')
  const qtyBaru = num(fd, 'qty_baru')
  const alasan = str(fd, 'alasan')
  if (!batchId) kembali(PATH, { error: 'Batch tidak valid' })
  if (!Number.isInteger(qtyBaru) || qtyBaru < 0) kembali(PATH, { error: 'Jumlah baru harus bilangan bulat ≥ 0' })
  if (!ALASAN.includes(alasan)) kembali(PATH, { error: 'Pilih alasan penyesuaian' })
  const supabase = await createClient()
  const { error } = await supabase.rpc('adjust_stock', { p_batch: batchId, p_qty_baru: qtyBaru, p_alasan: alasan, p_catatan: str(fd, 'catatan') || null })
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  revalidatePath('/gudang/inventori')
  revalidatePath('/gudang/saran')
  kembali(PATH, { ok: 'Penyesuaian stok dicatat' })
}
