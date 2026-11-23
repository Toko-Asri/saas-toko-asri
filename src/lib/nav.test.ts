import { describe, expect, test } from 'vitest'
import { menuFor } from './roles'
import { NAMA_PERAN, inisial, itemAktif, kelompokMenu, perluIntro } from './nav'

describe('itemAktif', () => {
  const hrefs = ['/', '/kasir', '/kasir/riwayat', '/pelanggan', '/pelanggan/segmen', '/gudang/inventori']
  test('beranda hanya aktif pada rute persis "/"', () => {
    expect(itemAktif('/', hrefs)).toBe('/')
    expect(itemAktif('/kasir', hrefs)).toBe('/kasir')
  })
  test('rute turunan mengaktifkan induknya', () => {
    expect(itemAktif('/pelanggan/abc-123', hrefs)).toBe('/pelanggan')
    expect(itemAktif('/gudang/inventori', hrefs)).toBe('/gudang/inventori')
  })
  test('awalan terpanjang menang: /kasir/riwayat/123 -> riwayat, bukan kasir', () => {
    expect(itemAktif('/kasir/riwayat/123', hrefs)).toBe('/kasir/riwayat')
    expect(itemAktif('/pelanggan/segmen', hrefs)).toBe('/pelanggan/segmen')
  })
  test('pencocokan per segmen: /kasirx bukan /kasir', () => {
    expect(itemAktif('/kasirx', hrefs)).toBeNull()
  })
  test('rute tak dikenal -> null', () => expect(itemAktif('/tidak-ada', hrefs)).toBeNull())
})

describe('kelompokMenu', () => {
  test('setiap item menu tiap peran muncul tepat sekali, tidak ada yang hilang', () => {
    for (const p of ['pemilik', 'kasir', 'staf_gudang'] as const) {
      const asal = menuFor(p).map((m) => m.href).sort()
      const hasil = kelompokMenu(menuFor(p)).flatMap((g) => g.item.map((i) => i.href)).sort()
      expect(hasil).toEqual(asal)
    }
  })
  test('kelompok kosong tidak ditampilkan', () => {
    const kasir = kelompokMenu(menuFor('kasir')).map((g) => g.judul)
    expect(kasir).not.toContain('Gudang & Pasokan')
    expect(kasir).not.toContain('Laporan')
  })
  test('urutan kelompok tetap: Ringkasan, Penjualan, Pelanggan, Gudang & Pasokan, Laporan', () => {
    expect(kelompokMenu(menuFor('pemilik')).map((g) => g.judul)).toEqual(['Ringkasan', 'Penjualan', 'Pelanggan', 'Gudang & Pasokan', 'Laporan'])
  })
  test('setiap item punya kunci ikon', () => {
    for (const g of kelompokMenu(menuFor('pemilik'))) for (const i of g.item) expect(i.ikon).toBeTruthy()
  })
  test('href tak dikenal tetap muncul di kelompok "Lainnya" (tidak menghilangkan akses)', () => {
    const g = kelompokMenu([{ href: '/baru', label: 'Baru' }])
    expect(g).toEqual([{ judul: 'Lainnya', item: [{ href: '/baru', label: 'Baru', ikon: 'default' }] }])
  })
})

describe('inisial dan nama peran', () => {
  test('inisial dua kata pertama', () => {
    expect(inisial('Ani Wijaya')).toBe('AW')
    expect(inisial('  budi santoso kusuma ')).toBe('BS')
  })
  test('satu kata dan kosong', () => {
    expect(inisial('Dewi')).toBe('D')
    expect(inisial('')).toBe('?')
    expect(inisial('   ')).toBe('?')
  })
  test('nama peran', () => {
    expect(NAMA_PERAN).toEqual({ pemilik: 'Pemilik', kasir: 'Kasir', staf_gudang: 'Staf Gudang' })
  })
})

describe('perluIntro', () => {
  test('tampil bila belum pernah dan gerak tidak dikurangi', () => {
    expect(perluIntro({ sudahTampil: false, kurangiGerak: false })).toBe(true)
  })
  test('tidak tampil lagi dalam sesi yang sama', () => {
    expect(perluIntro({ sudahTampil: true, kurangiGerak: false })).toBe(false)
  })
  test('prefers-reduced-motion melewati intro sepenuhnya', () => {
    expect(perluIntro({ sudahTampil: false, kurangiGerak: true })).toBe(false)
  })
})
