import { describe, expect, test } from 'vitest'
import { bisaBayar, buatPenjaga } from './pos-guard'

const siap = { jumlahItem: 2, memproses: false, kembalian: 0 as number | null, pelangganHilang: false }

describe('bisaBayar', () => {
  test('keranjang terisi, tidak memproses, bayar cukup -> boleh', () => {
    expect(bisaBayar(siap)).toBe(true)
  })
  test('keranjang kosong -> tidak boleh', () => {
    expect(bisaBayar({ ...siap, jumlahItem: 0 })).toBe(false)
  })
  test('sedang memproses -> tidak boleh', () => {
    expect(bisaBayar({ ...siap, memproses: true })).toBe(false)
  })
  test('uang kurang (kembalian null) -> tidak boleh', () => {
    expect(bisaBayar({ ...siap, kembalian: null })).toBe(false)
  })
  test('pelanggan terpilih sudah tidak tersedia -> tidak boleh sampai dipilih ulang atau memilih tamu', () => {
    expect(bisaBayar({ ...siap, pelangganHilang: true })).toBe(false)
  })
  test('kembalian 0 (uang pas) tetap boleh', () => {
    expect(bisaBayar({ ...siap, kembalian: 0 })).toBe(true)
  })
})

describe('buatPenjaga', () => {
  test('dua panggilan pada saat yang sama (klik ganda) hanya menjalankan fungsi sekali', async () => {
    let jumlah = 0
    let selesai!: () => void
    const tunggu = new Promise<void>((r) => { selesai = r })
    const penjaga = buatPenjaga()
    const fn = async () => { jumlah++; await tunggu; return 'ok' }
    const a = penjaga.jalankan(fn)
    const b = penjaga.jalankan(fn) // klik kedua sebelum yang pertama selesai
    selesai()
    expect(await a).toBe('ok')
    expect(await b).toBeUndefined()
    expect(jumlah).toBe(1)
  })
  test('setelah selesai, boleh dijalankan lagi', async () => {
    let jumlah = 0
    const penjaga = buatPenjaga()
    await penjaga.jalankan(async () => { jumlah++ })
    await penjaga.jalankan(async () => { jumlah++ })
    expect(jumlah).toBe(2)
  })
  test('bila fungsi gagal, kunci dilepas dan galat diteruskan ke pemanggil pertama', async () => {
    const penjaga = buatPenjaga()
    await expect(penjaga.jalankan(async () => { throw new Error('gagal') })).rejects.toThrow('gagal')
    let jumlah = 0
    await penjaga.jalankan(async () => { jumlah++ }) // tidak macet
    expect(jumlah).toBe(1)
  })
  test('panggilan berturut-turut tanpa menunggu dihitung sekali', async () => {
    let jumlah = 0
    const penjaga = buatPenjaga()
    const fn = async () => { jumlah++ }
    await Promise.all([penjaga.jalankan(fn), penjaga.jalankan(fn), penjaga.jalankan(fn)])
    expect(jumlah).toBe(1)
  })
  test('dua penjaga terpisah tidak saling mengunci', async () => {
    let jumlah = 0
    let selesai!: () => void
    const tunggu = new Promise<void>((r) => { selesai = r })
    const a = buatPenjaga(); const b = buatPenjaga()
    const pa = a.jalankan(async () => { await tunggu; jumlah++ })
    await b.jalankan(async () => { jumlah++ })
    selesai(); await pa
    expect(jumlah).toBe(2)
  })
})
