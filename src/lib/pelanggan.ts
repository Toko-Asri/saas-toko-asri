export type InputPelanggan = { nama: string; telepon: string; email: string; alamat: string; catatan: string }
export type DataPelanggan = { nama: string; telepon: string | null; email: string | null; alamat: string | null; catatan: string | null }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validasi form pelanggan di sisi server. Pengecekan keunikan telepon dilakukan database.
export function validasiPelanggan(i: InputPelanggan): { data?: DataPelanggan; error?: string } {
  const nama = i.nama.trim()
  if (!nama) return { error: 'Nama pelanggan wajib diisi' }
  const telepon = i.telepon.trim()
  if (telepon) {
    const digit = telepon.replace(/\D/g, '').length
    if (digit < 8 || digit > 15) return { error: 'Nomor telepon harus 8–15 digit' }
    // sama dengan check di database: nomor Indonesia (diawali 0, 62, +62, 0062, atau 8)
    const n = normalisasiTelepon(telepon)
    if (!n || !/^62[0-9]{6,13}$/.test(n)) return { error: 'Nomor telepon harus nomor Indonesia (mis. 0812…, +62 812…)' }
  }
  const email = i.email.trim()
  if (email && !EMAIL.test(email)) return { error: 'Format email tidak valid' }
  return {
    data: { nama, telepon: telepon || null, email: email || null, alamat: i.alamat.trim() || null, catatan: i.catatan.trim() || null },
  }
}

// Membuang karakter yang bermakna khusus pada filter PostgREST `or(...)` dan ilike.
export function bersihkanPencarian(q: string): string {
  return q.replace(/[,()%*\\_'"]/g, '').trim().slice(0, 50)
}

// Pola pencarian telepon sesuai normalisasi database (hanya digit, awalan 0 -> 62).
export function polaTelepon(q: string): string {
  const d = q.replace(/\D/g, '')
  if (!d) return ''
  return d.startsWith('0') ? '62' + d.slice(1) : d
}

// Pencarian pelanggan di kasir: nama (tanpa peka huruf) atau telepon (format apa pun). Kosong -> tidak ada hasil.
export function saringPelanggan<T extends { nama: string; telepon: string | null }>(daftar: T[], kata: string, batas = 8): T[] {
  const q = kata.trim().toLowerCase()
  if (!q) return []
  const tel = polaTelepon(q)
  return daftar
    .filter((p) => p.nama.toLowerCase().includes(q) || (tel.length >= 3 && p.telepon !== null && p.telepon.includes(tel)))
    .slice(0, batas)
}

// Cermin normalisasi_telepon (SQL, migration 20261120001100): hanya digit; 00 dibuang; 0 -> 62; 8 -> 628.
export function normalisasiTelepon(p: string): string | null {
  if (!p.trim()) return null
  let d = p.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '62' + d.slice(1)
  if (d.startsWith('8')) d = '62' + d
  return d
}
