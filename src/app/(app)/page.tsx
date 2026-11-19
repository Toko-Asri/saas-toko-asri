import Link from 'next/link'
import { getSessionProfile } from '@/lib/auth'
import { menuFor } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'
import type { KodePeriode } from '@/lib/periode'
import { BerandaPemilik, PERIODE } from './beranda/pemilik'

export default async function Beranda({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const profil = await getSessionProfile()
  if (!profil) return null
  if (profil.peran === 'pemilik') {
    const { p } = await searchParams
    const periode: KodePeriode = PERIODE.some((x) => x.kode === p) ? (p as KodePeriode) : '7-hari'
    return <BerandaPemilik periode={periode} nama={profil.nama} />
  }
  const menu = menuFor(profil.peran).filter((m) => m.href !== '/')
  let saran: number | null = null
  if (menu.length > 0) {
    const supabase = await createClient()
    const { count } = await supabase.from('purchase_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'terbuka')
    saran = count ?? 0
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Halo, {profil.nama}</h1>
      {saran !== null && saran > 0 && (
        <Link href="/gudang/saran" className="block rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <b>{saran} produk</b> berada di bawah stok minimum dan perlu dipesan ke pemasok →
        </Link>
      )}
      {menu.length === 0 ? (
        <p className="text-slate-600">Modul kasir tersedia pada tahap berikutnya.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="rounded-lg border bg-white p-4 font-medium hover:border-sky-500">{m.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}
