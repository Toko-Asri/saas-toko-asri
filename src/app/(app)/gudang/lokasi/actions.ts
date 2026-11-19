'use server'
import { revalidatePath } from 'next/cache'
import { assertGudang } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { kembali, num, pesanGalat, str } from '../_lib'

const PATH = '/gudang/lokasi'

export async function simpanLokasi(fd: FormData) {
  await assertGudang()
  const id = str(fd, 'id')
  const nama = str(fd, 'nama')
  const tipe = str(fd, 'tipe')
  const suhuMin = num(fd, 'suhu_min')
  const suhuMaks = num(fd, 'suhu_maks')
  if (!nama) kembali(PATH, { error: 'Nama lokasi wajib diisi' })
  if (!['freezer', 'chiller', 'kering'].includes(tipe)) kembali(PATH, { error: 'Tipe lokasi tidak valid' })
  if (!Number.isNaN(suhuMin) && !Number.isNaN(suhuMaks) && suhuMin > suhuMaks) kembali(PATH, { error: 'Suhu minimum tidak boleh lebih besar dari suhu maksimum' })
  const data = { nama, tipe, suhu_min: Number.isNaN(suhuMin) ? null : suhuMin, suhu_maks: Number.isNaN(suhuMaks) ? null : suhuMaks }
  const supabase = await createClient()
  const { error } = id ? await supabase.from('storage_locations').update(data).eq('id', id) : await supabase.from('storage_locations').insert(data)
  if (error) kembali(PATH, { error: pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Lokasi disimpan' })
}

export async function hapusLokasi(fd: FormData) {
  await assertGudang()
  const supabase = await createClient()
  const { error } = await supabase.from('storage_locations').delete().eq('id', str(fd, 'id'))
  if (error) kembali(PATH, { error: error.code === '23503' ? 'Lokasi masih dipakai oleh batch, tidak bisa dihapus' : pesanGalat(error) })
  revalidatePath(PATH)
  kembali(PATH, { ok: 'Lokasi dihapus' })
}
