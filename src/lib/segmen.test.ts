import { describe, expect, test } from 'vitest'
import { hitungSegmen, perluDihubungi, saringSegmen, type BarisSegmen } from './segmen'

const b = (id: string, tier: BarisSegmen['tier'], aktivitas: BarisSegmen['aktivitas'], total = 0): BarisSegmen => ({
  id, nama: `P${id}`, telepon: null, tier, aktivitas, poin: 0, total_belanja: total, jumlah_transaksi: 0, hari_sejak_belanja: null,
})
const data = [
  b('1', 'gold', 'aktif'), b('2', 'gold', 'berisiko'), b('3', 'silver', 'tidak_aktif'), b('4', 'silver', 'aktif'),
  b('5', 'reguler', 'baru'), b('6', 'reguler', 'berisiko'), b('7', 'reguler', 'tidak_aktif'),
]

describe('hitungSegmen', () => {
  test('hitungan per tier dan per aktivitas', () => {
    const r = hitungSegmen(data)
    expect(r.perTier).toEqual({ reguler: 3, silver: 2, gold: 2 })
    expect(r.perAktivitas).toEqual({ baru: 1, aktif: 2, berisiko: 2, tidak_aktif: 2 })
  })
  test('matriks tier x aktivitas', () => {
    const r = hitungSegmen(data)
    expect(r.matriks.gold).toEqual({ baru: 0, aktif: 1, berisiko: 1, tidak_aktif: 0 })
    expect(r.matriks.silver.tidak_aktif).toBe(1)
    expect(r.matriks.reguler.baru).toBe(1)
  })
  test('daftar kosong menghasilkan nol di mana-mana', () => {
    const r = hitungSegmen([])
    expect(r.perTier).toEqual({ reguler: 0, silver: 0, gold: 0 })
    expect(Object.values(r.matriks.gold).every((n) => n === 0)).toBe(true)
  })
  test('jumlah matriks sama dengan jumlah baris', () => {
    const r = hitungSegmen(data)
    const jumlah = Object.values(r.matriks).flatMap((m) => Object.values(m)).reduce((a, n) => a + n, 0)
    expect(jumlah).toBe(data.length)
  })
})

describe('perluDihubungi', () => {
  test('hanya silver/gold yang berisiko atau tidak aktif', () => {
    expect(perluDihubungi(data).map((x) => x.id).sort()).toEqual(['2', '3'])
  })
  test('urut total belanja terbesar dulu', () => {
    const rows = [b('a', 'silver', 'berisiko', 600000), b('b', 'gold', 'tidak_aktif', 3000000), b('c', 'silver', 'berisiko', 900000)]
    expect(perluDihubungi(rows).map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('saringSegmen', () => {
  test('menyaring per tier, per aktivitas, atau keduanya', () => {
    expect(saringSegmen(data, 'gold', undefined).map((x) => x.id)).toEqual(['1', '2'])
    expect(saringSegmen(data, undefined, 'berisiko').map((x) => x.id)).toEqual(['2', '6'])
    expect(saringSegmen(data, 'reguler', 'tidak_aktif').map((x) => x.id)).toEqual(['7'])
  })
  test('nilai tidak valid diabaikan', () => {
    expect(saringSegmen(data, 'platinum', 'bebas')).toHaveLength(data.length)
  })
})
