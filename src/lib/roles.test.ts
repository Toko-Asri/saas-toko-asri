import { describe, expect, test } from 'vitest'
import { canAccess, menuFor } from './roles'

describe('canAccess', () => {
  test('kasir tidak boleh membuka rute gudang', () => {
    expect(canAccess('kasir', '/gudang/pemasok')).toBe(false)
  })
  test('staf gudang boleh membuka inventori', () => {
    expect(canAccess('staf_gudang', '/gudang/inventori')).toBe(true)
  })
  test('pemilik boleh membuka semua rute', () => {
    expect(canAccess('pemilik', '/gudang/saran')).toBe(true)
  })
  test('semua peran boleh membuka beranda', () => {
    for (const p of ['pemilik', 'kasir', 'staf_gudang'] as const) expect(canAccess(p, '/')).toBe(true)
  })
  test('pencocokan per segmen: /gudangx bukan /gudang', () => {
    expect(canAccess('staf_gudang', '/gudangx')).toBe(false)
  })
  test('/gudang itu sendiri dianggap bagian gudang', () => {
    expect(canAccess('staf_gudang', '/gudang')).toBe(true)
    expect(canAccess('kasir', '/gudang')).toBe(false)
  })
})

describe('menuFor', () => {
  test('menu kasir tidak memuat gudang', () => {
    expect(menuFor('kasir').some((m) => m.href.startsWith('/gudang'))).toBe(false)
  })
  test('menu staf gudang memuat inventori, pembelian, dan saran', () => {
    const hrefs = menuFor('staf_gudang').map((m) => m.href)
    expect(hrefs).toEqual(expect.arrayContaining(['/gudang/inventori', '/gudang/pembelian', '/gudang/saran']))
  })
  test('setiap menu dapat diakses oleh perannya', () => {
    for (const p of ['pemilik', 'kasir', 'staf_gudang'] as const)
      for (const m of menuFor(p)) expect(canAccess(p, m.href)).toBe(true)
  })
})

describe('rute ERP (Tahap 2)', () => {
  test('kasir boleh /kasir dan /kasir/riwayat', () => {
    expect(canAccess('kasir', '/kasir')).toBe(true)
    expect(canAccess('kasir', '/kasir/riwayat')).toBe(true)
  })
  test('kasir tidak boleh /laporan dan /gudang', () => {
    expect(canAccess('kasir', '/laporan')).toBe(false)
    expect(canAccess('kasir', '/gudang/produk')).toBe(false)
  })
  test('staf gudang tidak boleh /laporan maupun /kasir, tetapi boleh penyesuaian stok', () => {
    expect(canAccess('staf_gudang', '/laporan')).toBe(false)
    expect(canAccess('staf_gudang', '/kasir')).toBe(false)
    expect(canAccess('staf_gudang', '/gudang/penyesuaian')).toBe(true)
  })
  test('pemilik boleh /laporan dan /kasir', () => {
    expect(canAccess('pemilik', '/laporan')).toBe(true)
    expect(canAccess('pemilik', '/kasir')).toBe(true)
  })
  test('pencocokan per segmen: /kasirx dan /laporanx ditolak untuk kasir', () => {
    expect(canAccess('kasir', '/kasirx')).toBe(false)
    expect(canAccess('kasir', '/laporanx')).toBe(false)
  })
  test('menu kasir: Beranda, Kasir, Riwayat Penjualan, Pelanggan', () => {
    expect(menuFor('kasir').map((m) => m.href)).toEqual(['/', '/kasir', '/kasir/riwayat', '/pelanggan'])
  })
  test('menu staf gudang memuat Penyesuaian Stok tanpa Laporan/Kasir', () => {
    const h = menuFor('staf_gudang').map((m) => m.href)
    expect(h).toContain('/gudang/penyesuaian')
    expect(h).not.toContain('/laporan')
    expect(h).not.toContain('/kasir')
  })
  test('menu pemilik memuat Laporan Keuangan dan Kasir', () => {
    const h = menuFor('pemilik').map((m) => m.href)
    expect(h).toEqual(expect.arrayContaining(['/laporan', '/kasir', '/kasir/riwayat', '/gudang/penyesuaian']))
  })
})

describe('rute CRM (Tahap 3)', () => {
  test('kasir boleh /pelanggan dan detail pelanggan', () => {
    expect(canAccess('kasir', '/pelanggan')).toBe(true)
    expect(canAccess('kasir', '/pelanggan/abc-123')).toBe(true)
  })
  test('kasir tidak boleh segmentasi (termasuk sub-rutenya)', () => {
    expect(canAccess('kasir', '/pelanggan/segmen')).toBe(false)
    expect(canAccess('kasir', '/pelanggan/segmen/apa-saja')).toBe(false)
  })
  test('/pelanggansegmen dan /pelangganx bukan /pelanggan', () => {
    expect(canAccess('kasir', '/pelangganx')).toBe(false)
    expect(canAccess('pemilik', '/pelanggan/segmen')).toBe(true)
  })
  test('staf gudang tidak boleh pelanggan apa pun', () => {
    expect(canAccess('staf_gudang', '/pelanggan')).toBe(false)
    expect(canAccess('staf_gudang', '/pelanggan/abc')).toBe(false)
    expect(canAccess('staf_gudang', '/pelanggan/segmen')).toBe(false)
  })
  test('menu kasir memuat Pelanggan tanpa Segmentasi; menu pemilik memuat keduanya; staf gudang tidak ada satu pun', () => {
    const k = menuFor('kasir').map((m) => m.href)
    expect(k).toContain('/pelanggan')
    expect(k).not.toContain('/pelanggan/segmen')
    const p = menuFor('pemilik').map((m) => m.href)
    expect(p).toEqual(expect.arrayContaining(['/pelanggan', '/pelanggan/segmen']))
    expect(menuFor('staf_gudang').some((m) => m.href.startsWith('/pelanggan'))).toBe(false)
  })
})
