import { describe, expect, test } from 'vitest'
import { parseItemsPo } from './po-items'

const fd = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.set(k, v)
  return f
}

describe('parseItemsPo', () => {
  test('harga kosong menjadi null agar database memakai harga produk, bukan Rp0', () => {
    const r = parseItemsPo(fd({ qty_a: '5', harga_a: '' }))
    expect(r).toEqual({ items: [{ product_id: 'a', qty: 5, harga_beli: null }] })
  })
  test('harga terisi dipakai apa adanya', () => {
    expect(parseItemsPo(fd({ qty_a: '5', harga_a: '1200' }))).toEqual({ items: [{ product_id: 'a', qty: 5, harga_beli: 1200 }] })
  })
  test('harga 0 yang diketik sengaja tetap 0', () => {
    expect(parseItemsPo(fd({ qty_a: '2', harga_a: '0' })).items?.[0].harga_beli).toBe(0)
  })
  test('qty kosong atau 0 dilewati', () => {
    expect(parseItemsPo(fd({ qty_a: '', qty_b: '0', qty_c: '3', harga_c: '10' })).items).toHaveLength(1)
  })
  test('qty negatif atau pecahan ditolak', () => {
    expect(parseItemsPo(fd({ qty_a: '-1' })).error).toMatch(/bilangan bulat/)
    expect(parseItemsPo(fd({ qty_a: '1.5' })).error).toMatch(/bilangan bulat/)
  })
  test('harga negatif ditolak', () => {
    expect(parseItemsPo(fd({ qty_a: '1', harga_a: '-5' })).error).toMatch(/harga/i)
  })
  test('tidak ada item sama sekali menghasilkan daftar kosong', () => {
    expect(parseItemsPo(fd({ qty_a: '' }))).toEqual({ items: [] })
  })
})
