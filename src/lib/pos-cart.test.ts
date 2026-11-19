import { describe, expect, test } from 'vitest'
import { kembalian, keItemCheckout, tambah, total, ubahQty, type BarisKeranjang } from './pos-cart'

const nugget = { productId: 'n', nama: 'Nugget', harga: 36000, stokLayak: 2 }
const sosis = { productId: 's', nama: 'Sosis', harga: 41000, stokLayak: 10 }

describe('tambah', () => {
  test('produk baru masuk dengan qty 1', () => {
    expect(tambah([], nugget)).toEqual([{ ...nugget, qty: 1 }])
  })
  test('produk sama dua kali menambah qty, bukan baris baru', () => {
    expect(tambah(tambah([], nugget), nugget)).toEqual([{ ...nugget, qty: 2 }])
  })
  test('tidak melebihi stok layak jual', () => {
    const k = tambah(tambah(tambah([], nugget), nugget), nugget)
    expect(k[0].qty).toBe(2)
  })
  test('produk dengan stok 0 tidak ditambahkan', () => {
    expect(tambah([], { ...nugget, stokLayak: 0 })).toEqual([])
  })
  test('tidak mengubah array asal', () => {
    const k: BarisKeranjang[] = []
    tambah(k, nugget)
    expect(k).toEqual([])
  })
})

describe('ubahQty', () => {
  const k = [{ ...nugget, qty: 1 }, { ...sosis, qty: 2 }]
  test('qty 0 atau negatif menghapus baris', () => {
    expect(ubahQty(k, 'n', 0).map((b) => b.productId)).toEqual(['s'])
    expect(ubahQty(k, 'n', -3).map((b) => b.productId)).toEqual(['s'])
  })
  test('pecahan dibulatkan ke bawah', () => {
    expect(ubahQty(k, 's', 2.9).find((b) => b.productId === 's')?.qty).toBe(2)
  })
  test('dibatasi stok layak jual', () => {
    expect(ubahQty(k, 'n', 99).find((b) => b.productId === 'n')?.qty).toBe(2)
  })
  test('nilai bukan angka diperlakukan sebagai hapus', () => {
    expect(ubahQty(k, 'n', Number.NaN).map((b) => b.productId)).toEqual(['s'])
  })
})

describe('total, kembalian, keItemCheckout', () => {
  const k = [{ ...nugget, qty: 2 }, { ...sosis, qty: 1 }]
  test('total = jumlah harga x qty', () => expect(total(k)).toBe(2 * 36000 + 41000))
  test('total keranjang kosong 0', () => expect(total([])).toBe(0))
  test('kembalian', () => {
    expect(kembalian(40000, 50000)).toBe(10000)
    expect(kembalian(40000, 40000)).toBe(0)
    expect(kembalian(0, 0)).toBe(0)
  })
  test('bayar kurang dari total -> null', () => expect(kembalian(40000, 39999)).toBeNull())
  test('keItemCheckout hanya product_id dan qty', () => {
    expect(keItemCheckout(k)).toEqual([{ product_id: 'n', qty: 2 }, { product_id: 's', qty: 1 }])
  })
})
