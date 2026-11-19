import { getSessionProfile } from '@/lib/auth'
import type { KodePeriode } from '@/lib/periode'
import { BerandaGudang } from './beranda/gudang'
import { BerandaKasir } from './beranda/kasir'
import { BerandaPemilik, PERIODE } from './beranda/pemilik'

// Beranda per peran: pemilik = dashboard penuh, kasir = ringkasan penjualannya sendiri, staf gudang = ringkasan stok.
export default async function Beranda({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const profil = await getSessionProfile()
  if (!profil) return null
  if (profil.peran === 'kasir') return <BerandaKasir nama={profil.nama} />
  if (profil.peran === 'staf_gudang') return <BerandaGudang nama={profil.nama} />
  const { p } = await searchParams
  const periode: KodePeriode = PERIODE.some((x) => x.kode === p) ? (p as KodePeriode) : '7-hari'
  return <BerandaPemilik periode={periode} nama={profil.nama} />
}
