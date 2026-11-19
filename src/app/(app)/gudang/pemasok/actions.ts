'use server'
import { revalidatePath } from 'next/cache'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { kembali, pesanGalat, str } from '@/lib/form'

const PATH = '/gudang/pemasok'

export async function simpanPemasok(fd: FormData) {
  await assertGudang()
  const id = str(fd, 'id')
  const nama = str(fd, 'nama')
  if (!nama) kembali(PATH, { error: 'Nama pemasok wajib diisi' })
  const data = { nama, kontak: str(fd, 'kontak') || null, telepon: str(fd, 'telepon') || null, alamat: str(fd, 'alamat') || null }
  const supabase = await createClient()
  const { error } = id ? await supabase.from('suppliers').update(data).eq('id', id) : await supabase.from('suppliers').insert(data)
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Pemasok disimpan' })
}

export async function ubahAktifPemasok(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').update({ aktif: str(fd, 'aktif') === 'true' }).eq('id', str(fd, 'id'))
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Status pemasok diubah' })
}
