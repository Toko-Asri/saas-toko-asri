import type { MenuItem, Peran } from './roles'

export const NAMA_PERAN: Record<Peran, string> = { pemilik: 'Pemilik', kasir: 'Kasir', staf_gudang: 'Staf Gudang' }

// Item yang aktif pada rute saat ini: awalan terpanjang yang cocok per segmen ('/' hanya cocok persis).
export function itemAktif(pathname: string, hrefs: string[]): string | null {
  let terbaik: string | null = null
  for (const h of hrefs) {
    const cocok = h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(h + '/')
    if (cocok && (terbaik === null || h.length > terbaik.length)) terbaik = h
  }
  return terbaik
}

export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean)
  if (kata.length === 0) return '?'
  return kata.slice(0, 2).map((k) => k[0].toUpperCase()).join('')
}

// Pengelompokan menu hanya untuk tampilan; hak akses tetap ditentukan roles.ts.
const KELOMPOK: { judul: string; ikon: Record<string, string> }[] = [
  { judul: 'Ringkasan', ikon: { '/': 'beranda' } },
  { judul: 'Penjualan', ikon: { '/kasir': 'kasir', '/kasir/riwayat': 'riwayat' } },
  { judul: 'Pelanggan', ikon: { '/pelanggan': 'pelanggan', '/pelanggan/segmen': 'segmen' } },
  {
    judul: 'Gudang & Pasokan',
    ikon: {
      '/gudang/inventori': 'inventori', '/gudang/saran': 'saran', '/gudang/pembelian': 'pembelian',
      '/gudang/penyesuaian': 'penyesuaian', '/gudang/produk': 'produk', '/gudang/pemasok': 'pemasok', '/gudang/lokasi': 'lokasi',
    },
  },
  { judul: 'Laporan', ikon: { '/laporan': 'laporan' } },
]

export type ItemNav = { href: string; label: string; ikon: string }
export type KelompokNav = { judul: string; item: ItemNav[] }

export function kelompokMenu(menu: MenuItem[]): KelompokNav[] {
  const hasil: KelompokNav[] = []
  const dipakai = new Set<string>()
  for (const k of KELOMPOK) {
    const item = menu.filter((m) => m.href in k.ikon).map((m) => ({ href: m.href, label: m.label, ikon: k.ikon[m.href] }))
    item.forEach((i) => dipakai.add(i.href))
    if (item.length > 0) hasil.push({ judul: k.judul, item })
  }
  // Rute baru yang belum dipetakan tidak boleh hilang dari navigasi.
  const sisa = menu.filter((m) => !dipakai.has(m.href)).map((m) => ({ href: m.href, label: m.label, ikon: 'default' }))
  if (sisa.length > 0) hasil.push({ judul: 'Lainnya', item: sisa })
  return hasil
}

// Opening animation: sekali per sesi, dilewati bila pengguna meminta gerak dikurangi.
export function perluIntro(s: { sudahTampil: boolean; kurangiGerak: boolean }): boolean {
  return !s.sudahTampil && !s.kurangiGerak
}
