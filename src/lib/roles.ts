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

const BERANDA: MenuItem = { href: '/', label: 'Beranda' }

const MENU: Record<Peran, MenuItem[]> = {
  pemilik: [BERANDA, ...GUDANG],
  staf_gudang: [BERANDA, ...GUDANG],
  kasir: [BERANDA],
}

// Awalan rute yang boleh dibuka selain beranda ('/'), per peran.
const PREFIX: Record<Peran, string[] | 'semua'> = {
  pemilik: 'semua',
  staf_gudang: ['/gudang'],
  kasir: [],
}

export function canAccess(peran: Peran, path: string): boolean {
  if (path === '/') return true
  const rule = PREFIX[peran]
  if (rule === 'semua') return true
  return rule.some((p) => path === p || path.startsWith(p + '/'))
}

export function menuFor(peran: Peran): MenuItem[] {
  return MENU[peran]
}
