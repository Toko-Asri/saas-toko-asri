// Aturan loyalitas. Sumber tunggal ada di SQL (poin_dari, tier_dari di migration 20261120000600);
// berkas ini mencerminkannya untuk tampilan dan diuji dengan angka yang sama.
export type Tier = 'reguler' | 'silver' | 'gold'
export type Aktivitas = 'baru' | 'aktif' | 'berisiko' | 'tidak_aktif'

export const RUPIAH_PER_POIN = 10_000
export const BATAS_SILVER = 500_000
export const BATAS_GOLD = 2_000_000

export function poinDari(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.floor(total / RUPIAH_PER_POIN)
}

export function tierDari(totalBelanja: number): Tier {
  if (totalBelanja >= BATAS_GOLD) return 'gold'
  if (totalBelanja >= BATAS_SILVER) return 'silver'
  return 'reguler'
}

// Kemajuan menuju tier berikutnya; persen dalam rentang tier saat ini (0-100).
export function kemajuanTier(totalBelanja: number): { tier: Tier; berikutnya: Tier | null; kurang: number; persen: number } {
  const total = Number.isFinite(totalBelanja) && totalBelanja > 0 ? totalBelanja : 0
  const tier = tierDari(total)
  if (tier === 'gold') return { tier, berikutnya: null, kurang: 0, persen: 100 }
  const [awal, akhir, berikutnya] = tier === 'reguler' ? [0, BATAS_SILVER, 'silver' as Tier] : [BATAS_SILVER, BATAS_GOLD, 'gold' as Tier]
  return { tier, berikutnya, kurang: akhir - total, persen: Math.floor(((total - awal) / (akhir - awal)) * 100) }
}

export function labelTier(t: Tier): string {
  return { reguler: 'Reguler', silver: 'Silver', gold: 'Gold' }[t]
}

export function labelAktivitas(a: Aktivitas): string {
  return { baru: 'Baru', aktif: 'Aktif', berisiko: 'Berisiko', tidak_aktif: 'Tidak aktif' }[a]
}

export function linkWhatsapp(telepon: string | null, pesan?: string): string | null {
  const digit = (telepon ?? '').replace(/\D/g, '')
  if (!digit) return null
  return `https://wa.me/${digit}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`
}
