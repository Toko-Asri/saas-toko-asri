const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatRupiah(n: number): string {
  return rupiah.format(n).replace(/\s/g, '')
}

// Menerima 'YYYY-MM-DD' atau timestamp ISO; tanggal dibaca sebagai UTC agar tidak bergeser zona waktu.
export function formatTanggal(iso: string): string {
  return tanggal.format(new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso))
}
