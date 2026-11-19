export type KodePeriode = 'hari-ini' | '7-hari' | '30-hari' | 'bulan-ini'

const tglWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })

function iso(tanggalUtc: Date) {
  return tanggalUtc.toISOString().slice(0, 10)
}

// Rentang tanggal (YYYY-MM-DD, WIB). `sampai` selalu hari ini WIB.
export function rentangPeriode(kode: KodePeriode, now: Date = new Date()): { dari: string; sampai: string } {
  const sampai = tglWib.format(now)
  const [y, m, d] = sampai.split('-').map(Number)
  const mundur = (hari: number) => iso(new Date(Date.UTC(y, m - 1, d - hari)))
  switch (kode) {
    case 'hari-ini': return { dari: sampai, sampai }
    case '7-hari': return { dari: mundur(6), sampai }
    case '30-hari': return { dari: mundur(29), sampai }
    case 'bulan-ini': return { dari: iso(new Date(Date.UTC(y, m - 1, 1))), sampai }
  }
}
