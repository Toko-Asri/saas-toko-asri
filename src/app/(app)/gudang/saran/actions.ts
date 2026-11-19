'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { kembali, pesanGalat, str } from '@/lib/form'

const PATH = '/gudang/saran'

export async function buatPoDariSaran(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_po_from_suggestion', { p_suggestion: str(fd, 'id') })
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  redirect(`/gudang/pembelian/${data}?ok=${encodeURIComponent('PO draft dibuat dari saran pembelian')}`)
}

export async function abaikanSaran(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { error } = await supabase.from('purchase_suggestions').update({ status: 'diabaikan' }).eq('id', str(fd, 'id')).eq('status', 'terbuka')
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Saran diabaikan sampai stok pulih di atas minimum' })
}

export async function bukaKembaliSaran(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { error } = await supabase.from('purchase_suggestions').update({ status: 'terbuka' }).eq('id', str(fd, 'id')).eq('status', 'diabaikan')
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Saran dibuka kembali' })
}
