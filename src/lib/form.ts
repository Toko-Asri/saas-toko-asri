import { redirect } from 'next/navigation'

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

// Angka dari form; kolom kosong menjadi NaN agar validasi menolaknya.
export const num = (fd: FormData, k: string) => {
  const v = str(fd, k)
  return v === '' ? NaN : Number(v)
}

export function kembali(path: string, pesan: { error?: string; ok?: string }): never {
  const q = pesan.error ? 'error=' + encodeURIComponent(pesan.error) : 'ok=' + encodeURIComponent(pesan.ok ?? '')
  redirect(`${path}?${q}`)
}

// Terjemahkan galat Postgres/RPC ke pesan yang dapat dibaca pengguna.
export function pesanGalat(e: { code?: string; message?: string } | null): string {
  if (!e) return 'Terjadi kesalahan'
  if (e.code === '23505') return 'Data sudah ada (nilai unik duplikat)'
  if (e.code === '23503') return 'Data masih digunakan di tempat lain'
  if (e.code === '42501') return 'Anda tidak berhak melakukan tindakan ini'
  if (e.code === '23514') return /telepon/i.test(e.message ?? '') ? 'Nomor telepon harus nomor Indonesia (mis. 0812…, +62 812…)' : 'Data tidak memenuhi aturan yang berlaku'
  return e.message ?? 'Terjadi kesalahan'
}
