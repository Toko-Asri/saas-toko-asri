import { describe, expect, test } from 'vitest'
import { bersihkanPencarian, polaTelepon, validasiPelanggan } from './pelanggan'

const dasar = { nama: 'Ani Wijaya', telepon: '', email: '', alamat: '', catatan: '' }

describe('validasiPelanggan', () => {
  test('hanya nama sudah cukup', () => {
    const r = validasiPelanggan(dasar)
    expect(r.error).toBeUndefined()
    expect(r.data).toEqual({ nama: 'Ani Wijaya', telepon: null, email: null, alamat: null, catatan: null })
  })
  test('nama kosong atau spasi ditolak', () => {
    expect(validasiPelanggan({ ...dasar, nama: '   ' }).error).toMatch(/nama/i)
  })
  test('nama dipangkas dari spasi', () => {
    expect(validasiPelanggan({ ...dasar, nama: '  Ani  ' }).data?.nama).toBe('Ani')
  })
  test('telepon: 8-15 digit, pemisah diabaikan', () => {
    expect(validasiPelanggan({ ...dasar, telepon: '0812-3456-7890' }).error).toBeUndefined()
    expect(validasiPelanggan({ ...dasar, telepon: '+62 812 3456 7890' }).error).toBeUndefined()
    expect(validasiPelanggan({ ...dasar, telepon: '08123' }).error).toMatch(/telepon/i)
    expect(validasiPelanggan({ ...dasar, telepon: '1'.repeat(16) }).error).toMatch(/telepon/i)
    expect(validasiPelanggan({ ...dasar, telepon: 'abcdefgh' }).error).toMatch(/telepon/i)
  })
  test('telepon kosong menjadi null (boleh tanpa telepon)', () => {
    expect(validasiPelanggan({ ...dasar, telepon: '  ' }).data?.telepon).toBeNull()
  })
  test('email berformat salah ditolak, kosong diterima', () => {
    expect(validasiPelanggan({ ...dasar, email: 'bukan-email' }).error).toMatch(/email/i)
    expect(validasiPelanggan({ ...dasar, email: 'a@b' }).error).toMatch(/email/i)
    expect(validasiPelanggan({ ...dasar, email: 'ani@contoh.id' }).data?.email).toBe('ani@contoh.id')
  })
  test('alamat dan catatan dipangkas; kosong menjadi null', () => {
    const r = validasiPelanggan({ ...dasar, alamat: '  Jl. Mawar 1 ', catatan: '' })
    expect(r.data?.alamat).toBe('Jl. Mawar 1')
    expect(r.data?.catatan).toBeNull()
  })
})

describe('bersihkanPencarian', () => {
  test('membuang karakter yang merusak filter (koma, kurung, wildcard)', () => {
    expect(bersihkanPencarian('ani,(wijaya)%*')).toBe('aniwijaya')
  })
  test('memangkas spasi dan membatasi 50 karakter', () => {
    expect(bersihkanPencarian('  ani  ')).toBe('ani')
    expect(bersihkanPencarian('x'.repeat(80))).toHaveLength(50)
  })
  test('kosong tetap kosong', () => expect(bersihkanPencarian('')).toBe(''))
})

describe('polaTelepon', () => {
  test('0 di depan menjadi 62, hanya digit', () => {
    expect(polaTelepon('0812-34')).toBe('62812' + '34')
    expect(polaTelepon('+62 812')).toBe('62812')
  })
  test('tanpa digit -> string kosong', () => expect(polaTelepon('ani')).toBe(''))
})

import { saringPelanggan } from './pelanggan'

describe('saringPelanggan (pemilih di kasir)', () => {
  const daftar = [
    { id: '1', nama: 'Ani Wijaya', telepon: '628120000001' },
    { id: '2', nama: 'Budi Santoso', telepon: '628120000002' },
    { id: '3', nama: 'Anita Dewi', telepon: null },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, nama: `Rani ${i}`, telepon: `62899${String(i).padStart(7, '0')}` })),
  ]
  test('pencarian nama tidak peka huruf besar/kecil', () => {
    expect(saringPelanggan(daftar, 'ANI').map((p) => p.id)).toEqual(expect.arrayContaining(['1', '3']))
  })
  test('pencarian telepon menerima format 0812…', () => {
    expect(saringPelanggan(daftar, '0812-0000-002').map((p) => p.id)).toEqual(['2'])
  })
  test('hasil dibatasi 8 secara bawaan', () => {
    expect(saringPelanggan(daftar, 'ani')).toHaveLength(8)
  })
  test('batas kustom', () => expect(saringPelanggan(daftar, 'ani', 2)).toHaveLength(2))
  test('kata kunci kosong -> tidak ada hasil (kasir harus mengetik)', () => {
    expect(saringPelanggan(daftar, '  ')).toEqual([])
  })
  test('telepon null tidak menyebabkan galat', () => {
    expect(saringPelanggan(daftar, 'dewi').map((p) => p.id)).toEqual(['3'])
  })
})
