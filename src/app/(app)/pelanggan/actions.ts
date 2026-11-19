'use server'
import { revalidatePath } from 'next/cache'
import { assertKasirAtauPemilik } from '@/lib/auth'
import { kembali, pesanGalat, str } from '@/lib/form'
import { validasiPelanggan } from '@/lib/pelanggan'
import { createClient } from '@/lib/supabase/server'

const PATH = '/pelanggan'

export async function simpanPelanggan(fd: FormData) {
  await assertKasirAtauPemilik()
  const id = str(fd, 'id')
  const hasil = validasiPelanggan({
    nama: str(fd, 'nama'), telepon: str(fd, 'telepon'), email: str(fd, 'email'), alamat: str(fd, 'alamat'), catatan: str(fd, 'catatan'),
  })
  if (hasil.error || !hasil.data) kembali(id ? `${PATH}?edit=${id}` : PATH, { error: hasil.error ?? 'Data tidak valid' })
  const supabase = await createClient()
  const { error } = id
    ? await supabase.from('customers').update(hasil.data).eq('id', id)
    : await supabase.from('customers').insert(hasil.data)
  if (error) kembali(id ? `${PATH}?edit=${id}` : PATH, { error: error.code === '23505' ? 'Nomor telepon sudah terdaftar' : pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Pelanggan disimpan' })
}

export async function ubahAktifPelanggan(fd: FormData) {
  await assertKasirAtauPemilik()
  const supabase = await createClient()
  const { error } = await supabase.from('customers').update({ aktif: str(fd, 'aktif') === 'true' }).eq('id', str(fd, 'id'))
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Status pelanggan diubah' })
}
