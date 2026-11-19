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
