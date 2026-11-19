import { describe, expect, test } from 'vitest'
import { pesanGalat } from './form'

describe('pesanGalat', () => {
  test('duplikat, dipakai, hak akses', () => {
    expect(pesanGalat({ code: '23505' })).toMatch(/sudah ada/)
    expect(pesanGalat({ code: '23503' })).toMatch(/masih digunakan/)
    expect(pesanGalat({ code: '42501' })).toMatch(/tidak berhak/)
  })
  test('pelanggaran check (mis. format nomor telepon) -> pesan yang dapat dibaca', () => {
    expect(pesanGalat({ code: '23514', message: 'violates check constraint "customers_telepon_format"' })).toMatch(/telepon/i)
    expect(pesanGalat({ code: '23514', message: 'violates check constraint "batches_qty_check"' })).toMatch(/aturan/i)
  })
  test('pesan RPC diteruskan; tanpa pesan -> generik', () => {
    expect(pesanGalat({ message: 'Stok Nugget tidak cukup' })).toBe('Stok Nugget tidak cukup')
    expect(pesanGalat(null)).toBe('Terjadi kesalahan')
  })
})
