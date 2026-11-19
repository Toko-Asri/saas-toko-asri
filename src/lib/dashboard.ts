export type ArahPerubahan = 'naik' | 'turun' | 'tetap' | 'baru'
export type Perubahan = { persen: number | null; arah: ArahPerubahan }

// Perubahan relatif terhadap periode pembanding. Pembanding 0 tidak pernah membagi dengan nol.
export function perubahan(sekarang: number, sebelumnya: number): Perubahan {
  if (!Number.isFinite(sekarang) || !Number.isFinite(sebelumnya)) return { persen: 0, arah: 'tetap' }
  if (sebelumnya === 0) {
    if (sekarang === 0) return { persen: 0, arah: 'tetap' }
    return { persen: null, arah: sekarang > 0 ? 'baru' : 'turun' }
  }
  const persen = Math.round(((sekarang - sebelumnya) / Math.abs(sebelumnya)) * 1000) / 10
  const arah: ArahPerubahan = Math.abs(((sekarang - sebelumnya) / Math.abs(sebelumnya)) * 100) < 0.05 ? 'tetap' : persen > 0 ? 'naik' : 'turun'
  return { persen: arah === 'tetap' ? 0 : persen, arah }
}

export function labelPerubahan(p: Perubahan): string {
  const angka = (n: number) => Math.abs(n).toFixed(1).replace('.', ',')
  if (p.arah === 'baru') return 'baru'
  if (p.arah === 'tetap') return '● sama'
  if (p.persen === null) return p.arah === 'turun' ? '▼' : '▲'
  return `${p.arah === 'naik' ? '▲' : '▼'} ${angka(p.persen)}%`
}

export type Tindakan = { kode: string; teks: string; tautan: string; tingkat: 'mendesak' | 'perlu' | 'info' }
export type MasukanTindakan = {
  saranTerbuka: number; batchKedaluwarsa: number; batchHampir: number; poMenunggu: number
  pelangganPerluDihubungi: number; produkHabis: number; integritasMasalah: number
}

// Daftar "Perlu tindakan": hanya yang jumlahnya > 0, urut mendesak -> perlu -> info.
export function tindakanPerluDiambil(i: MasukanTindakan): Tindakan[] {
  const semua: (Tindakan & { n: number })[] = [
    { n: i.integritasMasalah, kode: 'integritas', tingkat: 'mendesak', tautan: '/#integritas', teks: `${i.integritasMasalah} pemeriksaan integritas data gagal, periksa segera` },
    { n: i.batchKedaluwarsa, kode: 'kedaluwarsa', tingkat: 'mendesak', tautan: '/gudang/penyesuaian', teks: `${i.batchKedaluwarsa} batch sudah kedaluwarsa, buang dari stok` },
    { n: i.produkHabis, kode: 'habis', tingkat: 'mendesak', tautan: '/gudang/inventori', teks: `${i.produkHabis} produk stok layak jualnya habis` },
    { n: i.saranTerbuka, kode: 'saran', tingkat: 'perlu', tautan: '/gudang/saran', teks: `${i.saranTerbuka} saran pembelian menunggu keputusan (stok mencapai minimum), siapkan pesanan` },
    { n: i.poMenunggu, kode: 'po', tingkat: 'perlu', tautan: '/gudang/pembelian', teks: `${i.poMenunggu} pesanan pembelian menunggu barang datang` },
    { n: i.batchHampir, kode: 'hampir', tingkat: 'perlu', tautan: '/gudang/inventori?f=hampir', teks: `${i.batchHampir} batch hampir kedaluwarsa (14 hari atau kurang)` },
    { n: i.pelangganPerluDihubungi, kode: 'pelanggan', tingkat: 'info', tautan: '/pelanggan/segmen', teks: `${i.pelangganPerluDihubungi} pelanggan Silver/Gold mulai menjauh, hubungi mereka` },
  ]
  return semua.filter((t) => t.n > 0).map((t) => ({ kode: t.kode, teks: t.teks, tautan: t.tautan, tingkat: t.tingkat }))
}

const tglWib = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })

// Waktu relatif untuk umpan aktivitas; lebih dari 24 jam ditampilkan sebagai tanggal (WIB).
export function waktuRelatif(iso: string, sekarang: Date = new Date()): string {
  const selisihMenit = Math.floor((sekarang.getTime() - new Date(iso).getTime()) / 60_000)
  if (selisihMenit < 1) return 'baru saja'
  if (selisihMenit < 60) return `${selisihMenit} menit lalu`
  if (selisihMenit < 24 * 60) return `${Math.floor(selisihMenit / 60)} jam lalu`
  return tglWib.format(new Date(iso))
}
