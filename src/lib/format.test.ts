import { describe, expect, test } from 'vitest'
import { formatRupiah, formatTanggal } from './format'

describe('formatRupiah', () => {
  test('nol', () => expect(formatRupiah(0)).toBe('Rp0'))
  test('ribuan memakai titik, tanpa spasi', () => expect(formatRupiah(15000)).toBe('Rp15.000'))
  test('jutaan', () => expect(formatRupiah(1250000)).toBe('Rp1.250.000'))
  test('pecahan dibulatkan', () => expect(formatRupiah(1999.6)).toBe('Rp2.000'))
})

describe('formatTanggal', () => {
  test('tanggal ISO', () => expect(formatTanggal('2026-11-19')).toBe('19 Nov 2026'))
  test('tidak bergeser zona waktu pada awal bulan', () => expect(formatTanggal('2026-01-01')).toBe('1 Jan 2026'))
  test('timestamp ISO dengan jam', () => expect(formatTanggal('2026-11-19T23:30:00Z')).toBe('19 Nov 2026'))
})

import { ringkasRupiah } from './format'

describe('ringkasRupiah (sumbu grafik)', () => {
  test('di bawah seribu apa adanya', () => {
    expect(ringkasRupiah(0)).toBe('Rp0')
    expect(ringkasRupiah(950)).toBe('Rp950')
  })
  test('ribuan memakai rb', () => {
    expect(ringkasRupiah(1500)).toBe('Rp1,5 rb')
    expect(ringkasRupiah(36000)).toBe('Rp36 rb')
  })
  test('jutaan memakai jt, satu desimal tanpa nol di belakang', () => {
    expect(ringkasRupiah(1250000)).toBe('Rp1,3 jt')
    expect(ringkasRupiah(2000000)).toBe('Rp2 jt')
    expect(ringkasRupiah(17202000)).toBe('Rp17,2 jt')
  })
  test('miliar memakai M', () => expect(ringkasRupiah(1200000000)).toBe('Rp1,2 M'))
  test('negatif dan bukan angka', () => {
    expect(ringkasRupiah(-1500000)).toBe('-Rp1,5 jt')
    expect(ringkasRupiah(Number.NaN)).toBe('Rp0')
  })
})
