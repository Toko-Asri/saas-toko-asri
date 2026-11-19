import { describe, expect, test } from 'vitest'
import { labelPerubahan, perubahan, tindakanPerluDiambil } from './dashboard'

describe('perubahan', () => {
  test('naik', () => expect(perubahan(120, 100)).toEqual({ persen: 20, arah: 'naik' }))
  test('turun', () => expect(perubahan(90, 100)).toEqual({ persen: -10, arah: 'turun' }))
  test('sama', () => expect(perubahan(100, 100)).toEqual({ persen: 0, arah: 'tetap' }))
  test('pembanding 0 dan sekarang > 0 -> baru, tanpa pembagian dengan nol', () => {
    expect(perubahan(50, 0)).toEqual({ persen: null, arah: 'baru' })
  })
  test('keduanya 0 -> tetap', () => expect(perubahan(0, 0)).toEqual({ persen: 0, arah: 'tetap' }))
  test('turun ke 0 -> -100%', () => expect(perubahan(0, 50)).toEqual({ persen: -100, arah: 'turun' }))
  test('dibulatkan 1 desimal', () => expect(perubahan(1234, 1000)).toEqual({ persen: 23.4, arah: 'naik' }))
  test('perubahan sangat kecil (< 0,05%) dianggap tetap', () => {
    expect(perubahan(100000, 100001).arah).toBe('tetap')
  })
  test('pembanding negatif (rugi) memakai nilai mutlak sebagai dasar', () => {
    expect(perubahan(50, -100)).toEqual({ persen: 150, arah: 'naik' })
  })
  test('pembanding 0 dan sekarang negatif -> turun tanpa persen', () => {
    expect(perubahan(-10, 0)).toEqual({ persen: null, arah: 'turun' })
  })
  test('nilai bukan angka tidak menghasilkan NaN', () => {
    expect(perubahan(Number.NaN, 100)).toEqual({ persen: 0, arah: 'tetap' })
    expect(perubahan(100, Number.NaN)).toEqual({ persen: 0, arah: 'tetap' })
  })
})

describe('labelPerubahan', () => {
  test('format Indonesia dengan koma desimal', () => {
    expect(labelPerubahan(perubahan(120, 100))).toBe('▲ 20,0%')
    expect(labelPerubahan(perubahan(90, 100))).toBe('▼ 10,0%')
    expect(labelPerubahan(perubahan(1234, 1000))).toBe('▲ 23,4%')
  })
  test('sama dan baru', () => {
    expect(labelPerubahan(perubahan(100, 100))).toBe('● sama')
    expect(labelPerubahan(perubahan(50, 0))).toBe('baru')
  })
  test('turun tanpa persen', () => expect(labelPerubahan({ persen: null, arah: 'turun' })).toBe('▼'))
})

const nol = { saranTerbuka: 0, batchKedaluwarsa: 0, batchHampir: 0, poMenunggu: 0, pelangganPerluDihubungi: 0, produkHabis: 0, integritasMasalah: 0 }

describe('tindakanPerluDiambil', () => {
  test('semua nol -> kosong', () => expect(tindakanPerluDiambil(nol)).toEqual([]))
  test('hanya item > 0 dengan tautan dan tingkat yang benar', () => {
    const r = tindakanPerluDiambil({ ...nol, saranTerbuka: 3, pelangganPerluDihubungi: 2 })
    expect(r.map((t) => [t.kode, t.tingkat, t.tautan])).toEqual([
      ['saran', 'perlu', '/gudang/saran'],
      ['pelanggan', 'info', '/pelanggan/segmen'],
    ])
    expect(r[0].teks).toContain('3')
  })
  test('urut mendesak, lalu perlu, lalu info', () => {
    const r = tindakanPerluDiambil({ saranTerbuka: 1, batchKedaluwarsa: 2, batchHampir: 3, poMenunggu: 4, pelangganPerluDihubungi: 5, produkHabis: 6, integritasMasalah: 0 })
    expect(r.map((t) => t.tingkat)).toEqual(['mendesak', 'mendesak', 'perlu', 'perlu', 'perlu', 'info'])
    expect(r.map((t) => t.kode)).toEqual(['kedaluwarsa', 'habis', 'saran', 'po', 'hampir', 'pelanggan'])
  })
  test('integritas bermasalah selalu paling atas dan mendesak', () => {
    const r = tindakanPerluDiambil({ ...nol, batchKedaluwarsa: 1, integritasMasalah: 2 })
    expect(r[0]).toMatchObject({ kode: 'integritas', tingkat: 'mendesak', tautan: '/#integritas' })
    expect(r[1].kode).toBe('kedaluwarsa')
  })
  test('tautan setiap jenis', () => {
    const r = tindakanPerluDiambil({ saranTerbuka: 1, batchKedaluwarsa: 1, batchHampir: 1, poMenunggu: 1, pelangganPerluDihubungi: 1, produkHabis: 1, integritasMasalah: 1 })
    expect(Object.fromEntries(r.map((t) => [t.kode, t.tautan]))).toEqual({
      integritas: '/#integritas', kedaluwarsa: '/gudang/penyesuaian', habis: '/gudang/inventori',
      saran: '/gudang/saran', po: '/gudang/pembelian', hampir: '/gudang/inventori?f=hampir', pelanggan: '/pelanggan/segmen',
    })
  })
})
