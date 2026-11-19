export type Peran = 'pemilik' | 'kasir' | 'staf_gudang'

export type MenuItem = { href: string; label: string }

const GUDANG: MenuItem[] = [
  { href: '/gudang/inventori', label: 'Inventori' },
  { href: '/gudang/saran', label: 'Saran Pembelian' },
  { href: '/gudang/pembelian', label: 'Pesanan Pembelian' },
  { href: '/gudang/produk', label: 'Produk' },
  { href: '/gudang/pemasok', label: 'Pemasok' },
  { href: '/gudang/lokasi', label: 'Lokasi Simpan' },
]

const PENYESUAIAN: MenuItem = { href: '/gudang/penyesuaian', label: 'Penyesuaian Stok' }
const BERANDA: MenuItem = { href: '/', label: 'Beranda' }
const KASIR: MenuItem[] = [
  { href: '/kasir', label: 'Kasir' },
  { href: '/kasir/riwayat', label: 'Riwayat Penjualan' },
]
const LAPORAN: MenuItem = { href: '/laporan', label: 'Laporan Keuangan' }
const PELANGGAN: MenuItem = { href: '/pelanggan', label: 'Pelanggan' }
const SEGMENTASI: MenuItem = { href: '/pelanggan/segmen', label: 'Segmentasi Pelanggan' }

const MENU: Record<Peran, MenuItem[]> = {
  pemilik: [BERANDA, ...KASIR, PELANGGAN, SEGMENTASI, ...GUDANG, PENYESUAIAN, LAPORAN],
  staf_gudang: [BERANDA, ...GUDANG, PENYESUAIAN],
  kasir: [BERANDA, ...KASIR, PELANGGAN],
}

// Awalan rute yang boleh dibuka selain beranda ('/'), per peran.
const PREFIX: Record<Peran, string[] | 'semua'> = {
  pemilik: 'semua',
  staf_gudang: ['/gudang'],
  kasir: ['/kasir', '/pelanggan'],
}

// Rute yang ditolak walau awalannya diizinkan (diperiksa lebih dulu).
const TOLAK: Record<Peran, string[]> = {
  pemilik: [],
  staf_gudang: [],
  kasir: ['/pelanggan/segmen'],
}

export function canAccess(peran: Peran, path: string): boolean {
  if (path === '/') return true
  if (TOLAK[peran].some((p) => path === p || path.startsWith(p + '/'))) return false
  const rule = PREFIX[peran]
  if (rule === 'semua') return true
  return rule.some((p) => path === p || path.startsWith(p + '/'))
}

export function menuFor(peran: Peran): MenuItem[] {
  return MENU[peran]
}
