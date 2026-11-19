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
