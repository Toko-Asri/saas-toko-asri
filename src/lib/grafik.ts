// Batas atas sumbu Y yang "bulat" (1, 1,5, 2, 2,5, 3, 4, 5, 6, 8, 10 x 10^k) agar garis grid dan label mudah dibaca.
const LANGKAH = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

export function batasAtas(maks: number): number {
  if (!Number.isFinite(maks) || maks <= 0) return 1
  const orde = Math.pow(10, Math.floor(Math.log10(maks)))
  for (const l of LANGKAH) {
    const kandidat = Math.round(l * orde * 1e6) / 1e6
    if (kandidat >= maks) return kandidat
  }
  return orde * 10
}
