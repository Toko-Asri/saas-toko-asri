import { describe, expect, test } from 'vitest'
import { rentangPeriode } from './periode'

const sekarang = new Date('2026-11-18T18:00:00Z') // 01:00 WIB, 19 Nov 2026

describe('rentangPeriode (WIB)', () => {
  test('hari-ini memakai tanggal WIB, bukan UTC', () => {
    expect(rentangPeriode('hari-ini', sekarang)).toEqual({ dari: '2026-11-19', sampai: '2026-11-19' })
  })
  test('7-hari = hari ini dan 6 hari sebelumnya', () => {
    expect(rentangPeriode('7-hari', sekarang)).toEqual({ dari: '2026-11-13', sampai: '2026-11-19' })
  })
  test('30-hari = hari ini dan 29 hari sebelumnya', () => {
    expect(rentangPeriode('30-hari', sekarang)).toEqual({ dari: '2026-10-21', sampai: '2026-11-19' })
  })
  test('bulan-ini dimulai tanggal 1 bulan WIB', () => {
    expect(rentangPeriode('bulan-ini', sekarang)).toEqual({ dari: '2026-11-01', sampai: '2026-11-19' })
  })
  test('lintas pergantian bulan dan tahun', () => {
    expect(rentangPeriode('7-hari', new Date('2027-01-03T05:00:00Z'))).toEqual({ dari: '2026-12-28', sampai: '2027-01-03' })
  })
})
