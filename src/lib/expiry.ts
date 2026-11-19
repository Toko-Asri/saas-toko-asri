export type StatusKedaluwarsa = 'kedaluwarsa' | 'hampir' | 'aman'

const HARI_MS = 86_400_000

// Membandingkan tanggal kalender (bukan jam). Tanggal kedaluwarsa = hari ini sudah dianggap kedaluwarsa.
export function expiryStatus(tglKedaluwarsa: string, today: Date, warnDays = 14): StatusKedaluwarsa {
  const hariIni = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = tglKedaluwarsa.slice(0, 10).split('-').map(Number)
  const selisih = Math.round((Date.UTC(y, m - 1, d) - hariIni) / HARI_MS)
  if (selisih <= 0) return 'kedaluwarsa'
  if (selisih <= warnDays) return 'hampir'
  return 'aman'
}

// Tanggal kalender di Asia/Jakarta, dikembalikan sebagai Date lokal (jam 00:00) untuk expiryStatus.
export function hariIniJakarta(now: Date = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now).split('-').map(Number)
  return new Date(y, m - 1, d)
}
