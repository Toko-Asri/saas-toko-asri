import type { Aktivitas, Tier } from './loyalty'

export type BarisSegmen = {
  id: string; nama: string; telepon: string | null; tier: Tier; aktivitas: Aktivitas
  poin: number; total_belanja: number; jumlah_transaksi: number; hari_sejak_belanja: number | null
}

export const SEMUA_TIER: Tier[] = ['reguler', 'silver', 'gold']
export const SEMUA_AKTIVITAS: Aktivitas[] = ['baru', 'aktif', 'berisiko', 'tidak_aktif']

const nolAktivitas = (): Record<Aktivitas, number> => ({ baru: 0, aktif: 0, berisiko: 0, tidak_aktif: 0 })

export function hitungSegmen(rows: BarisSegmen[]) {
  const perTier: Record<Tier, number> = { reguler: 0, silver: 0, gold: 0 }
  const perAktivitas = nolAktivitas()
  const matriks: Record<Tier, Record<Aktivitas, number>> = { reguler: nolAktivitas(), silver: nolAktivitas(), gold: nolAktivitas() }
  for (const r of rows) {
    perTier[r.tier]++
    perAktivitas[r.aktivitas]++
    matriks[r.tier][r.aktivitas]++
  }
  return { perTier, perAktivitas, matriks }
}

// Pelanggan bernilai (silver/gold) yang mulai menjauh: prioritas tindak lanjut, terbesar dulu.
export function perluDihubungi(rows: BarisSegmen[]): BarisSegmen[] {
  return rows
    .filter((r) => (r.tier === 'silver' || r.tier === 'gold') && (r.aktivitas === 'berisiko' || r.aktivitas === 'tidak_aktif'))
    .sort((a, b) => b.total_belanja - a.total_belanja)
}

export function saringSegmen(rows: BarisSegmen[], tier?: string, aktivitas?: string): BarisSegmen[] {
  const t = SEMUA_TIER.find((x) => x === tier)
  const a = SEMUA_AKTIVITAS.find((x) => x === aktivitas)
  return rows.filter((r) => (!t || r.tier === t) && (!a || r.aktivitas === a))
}
