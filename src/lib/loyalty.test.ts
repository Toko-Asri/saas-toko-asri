import { describe, expect, test } from 'vitest'
import { kemajuanTier, labelAktivitas, labelTier, linkWhatsapp, poinDari, tierDari } from './loyalty'

// Angka sama dengan supabase/tests/crm_test.sql (poin_dari, tier_dari)
describe('poinDari', () => {
  test('Rp9.999 -> 0, Rp10.000 -> 1, Rp19.999 -> 1', () => {
    expect(poinDari(9999)).toBe(0)
    expect(poinDari(10000)).toBe(1)
    expect(poinDari(19999)).toBe(1)
  })
  test('nol, negatif, dan bukan angka tidak pernah menghasilkan poin negatif', () => {
    expect(poinDari(0)).toBe(0)
    expect(poinDari(-5)).toBe(0)
    expect(poinDari(Number.NaN)).toBe(0)
  })
})

describe('tierDari', () => {
  test('batas bawah termasuk tier atas', () => {
    expect(tierDari(0)).toBe('reguler')
    expect(tierDari(499999)).toBe('reguler')
    expect(tierDari(500000)).toBe('silver')
    expect(tierDari(1999999)).toBe('silver')
    expect(tierDari(2000000)).toBe('gold')
  })
})

describe('kemajuanTier', () => {
  test('reguler di tengah jalan menuju silver', () => {
    expect(kemajuanTier(250000)).toEqual({ tier: 'reguler', berikutnya: 'silver', kurang: 250000, persen: 50 })
  })
  test('tepat silver: menuju gold dari 0%', () => {
    expect(kemajuanTier(500000)).toEqual({ tier: 'silver', berikutnya: 'gold', kurang: 1500000, persen: 0 })
  })
  test('silver di tengah: 1.250.000 -> 50%', () => {
    expect(kemajuanTier(1250000)).toEqual({ tier: 'silver', berikutnya: 'gold', kurang: 750000, persen: 50 })
  })
  test('gold: tidak ada tier berikutnya', () => {
    expect(kemajuanTier(5000000)).toEqual({ tier: 'gold', berikutnya: null, kurang: 0, persen: 100 })
  })
  test('nol belanja', () => {
    expect(kemajuanTier(0)).toEqual({ tier: 'reguler', berikutnya: 'silver', kurang: 500000, persen: 0 })
  })
})

describe('label', () => {
  test('labelTier', () => {
    expect([labelTier('reguler'), labelTier('silver'), labelTier('gold')]).toEqual(['Reguler', 'Silver', 'Gold'])
  })
  test('labelAktivitas', () => {
    expect(['baru', 'aktif', 'berisiko', 'tidak_aktif'].map((a) => labelAktivitas(a as 'baru'))).toEqual(['Baru', 'Aktif', 'Berisiko', 'Tidak aktif'])
  })
})

describe('linkWhatsapp', () => {
  test('tanpa pesan', () => expect(linkWhatsapp('6281234567890')).toBe('https://wa.me/6281234567890'))
  test('dengan pesan di-encode', () => {
    expect(linkWhatsapp('6281234567890', 'Halo')).toBe('https://wa.me/6281234567890?text=Halo')
    expect(linkWhatsapp('6281234567890', 'Halo Ani, apa kabar?')).toBe('https://wa.me/6281234567890?text=Halo%20Ani%2C%20apa%20kabar%3F')
  })
  test('telepon kosong atau tanpa digit -> null', () => {
    expect(linkWhatsapp(null)).toBeNull()
    expect(linkWhatsapp('')).toBeNull()
    expect(linkWhatsapp('abc')).toBeNull()
  })
  test('hanya digit yang dipakai', () => expect(linkWhatsapp('+62 812-345')).toBe('https://wa.me/62812345'))
})
