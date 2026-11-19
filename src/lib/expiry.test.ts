import { describe, expect, test } from 'vitest'
import { expiryStatus } from './expiry'

const today = new Date(2026, 10, 19, 15, 30) // 19 Nov 2026, sore hari

describe('expiryStatus', () => {
  test('kemarin -> kedaluwarsa', () => expect(expiryStatus('2026-11-18', today)).toBe('kedaluwarsa'))
  test('hari ini -> kedaluwarsa (bukan hampir)', () => expect(expiryStatus('2026-11-19', today)).toBe('kedaluwarsa'))
  test('besok -> hampir', () => expect(expiryStatus('2026-11-20', today)).toBe('hampir'))
  test('tepat 14 hari lagi -> hampir', () => expect(expiryStatus('2026-12-03', today)).toBe('hampir'))
  test('15 hari lagi -> aman', () => expect(expiryStatus('2026-12-04', today)).toBe('aman'))
  test('lintas pergantian tahun', () => {
    const akhirTahun = new Date(2026, 11, 25)
    expect(expiryStatus('2027-01-08', akhirTahun)).toBe('hampir')
    expect(expiryStatus('2027-01-09', akhirTahun)).toBe('aman')
  })
  test('warnDays kustom', () => expect(expiryStatus('2026-11-26', today, 7)).toBe('hampir'))
  test('jam tidak memengaruhi: pagi dan malam hasilnya sama', () => {
    expect(expiryStatus('2026-11-19', new Date(2026, 10, 19, 0, 1))).toBe('kedaluwarsa')
    expect(expiryStatus('2026-11-20', new Date(2026, 10, 19, 23, 59))).toBe('hampir')
  })
})

import { hariIniJakarta } from './expiry'

describe('hariIniJakarta', () => {
  test('pukul 01:00 WIB sudah tanggal berikutnya dibanding UTC', () => {
    const d = hariIniJakarta(new Date('2026-11-18T18:00:00Z'))
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 19])
  })
  test('pukul 23:00 WIB masih tanggal yang sama', () => {
    const d = hariIniJakarta(new Date('2026-11-19T16:00:00Z'))
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 19])
  })
})
