const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatRupiah(n: number): string {
  return rupiah.format(n).replace(/\s/g, '')
}

// Menerima 'YYYY-MM-DD' atau timestamp ISO; tanggal dibaca sebagai UTC agar tidak bergeser zona waktu.
export function formatTanggal(iso: string): string {
  return tanggal.format(new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso))
}

// Rupiah ringkas untuk sumbu grafik dan angka padat: Rp950, Rp1,5 rb, Rp17,2 jt, Rp1,2 M.
export function ringkasRupiah(n: number): string {
  if (!Number.isFinite(n)) return 'Rp0'
  const tanda = n < 0 ? '-' : ''
  const a = Math.abs(n)
  const satuan = (nilai: number, akhiran: string) => {
    const bulat = Math.round(nilai * 10) / 10
    return `${tanda}Rp${String(bulat).replace('.', ',')} ${akhiran}`
  }
  if (a >= 1e9) return satuan(a / 1e9, 'M')
  if (a >= 1e6) return satuan(a / 1e6, 'jt')
  if (a >= 1e3) return satuan(a / 1e3, 'rb')
  return `${tanda}Rp${Math.round(a)}`
}
