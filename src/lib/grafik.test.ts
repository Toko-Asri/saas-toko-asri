import { describe, expect, test } from 'vitest'
import { batasAtas } from './grafik'

describe('batasAtas (skala sumbu Y yang bulat)', () => {
  test('naik ke langkah bulat berikutnya', () => {
    expect(batasAtas(726500)).toBe(800000)
    expect(batasAtas(1501000)).toBe(2000000)
    expect(batasAtas(36)).toBe(40)
  })
  test('nilai yang sudah bulat tidak berubah', () => {
    expect(batasAtas(1500000)).toBe(1500000)
    expect(batasAtas(2500)).toBe(2500)
    expect(batasAtas(10)).toBe(10)
  })
  test('lintas orde besaran', () => {
    expect(batasAtas(9100)).toBe(10000)
    expect(batasAtas(10001)).toBe(15000)
    expect(batasAtas(1250000000)).toBe(1500000000)
  })
  test('nol, negatif, dan bukan angka -> 1 (tidak pernah membagi dengan nol)', () => {
    expect(batasAtas(0)).toBe(1)
    expect(batasAtas(-5)).toBe(1)
    expect(batasAtas(Number.NaN)).toBe(1)
  })
  test('hasil selalu >= masukan', () => {
    for (const n of [1, 7, 99, 100, 101, 4999, 5000, 5001, 123456, 98765432]) expect(batasAtas(n)).toBeGreaterThanOrEqual(n)
  })
})
