import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { labelAktivitas, labelTier, linkWhatsapp } from '@/lib/loyalty'
import { hitungSegmen, perluDihubungi, saringSegmen, SEMUA_AKTIVITAS, SEMUA_TIER, type BarisSegmen } from '@/lib/segmen'
import { Banner, Card, LencanaTier, PageHeader, Table } from '@/components/ui'

const BATAS_DAFTAR = 200
const WARNA_SEL = (n: number) => (n === 0 ? 'text-slate-300' : 'font-semibold text-sky-800 hover:underline')

export default async function SegmenPage({ searchParams }: { searchParams: Promise<{ tier?: string; aktivitas?: string }> }) {
  const { tier, aktivitas } = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.from('pelanggan_segmen')
    .select('id, nama, telepon, tier, poin, total_belanja, jumlah_transaksi, hari_sejak_belanja, aktivitas').limit(5000)
  const semua: BarisSegmen[] = (data ?? []).map((r) => ({ ...r, total_belanja: Number(r.total_belanja), poin: Number(r.poin) })) as BarisSegmen[]
  const { perTier, perAktivitas, matriks } = hitungSegmen(semua)
  const hubungi = perluDihubungi(semua)
  const tampil = saringSegmen(semua, tier, aktivitas)
  const terfilter = SEMUA_TIER.includes(tier as never) || SEMUA_AKTIVITAS.includes(aktivitas as never)
  const url = (t: string, a: string) => `/pelanggan/segmen?tier=${t}&aktivitas=${a}`

  return (
    <div className="space-y-4">
      <PageHeader title="Segmentasi Pelanggan" subtitle="Tier berdasarkan total belanja; aktivitas berdasarkan belanja terakhir (WIB): aktif ≤ 30 hari, berisiko 31–90 hari, tidak aktif > 90 hari." />
      <Banner error={error?.message} />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {SEMUA_TIER.map((t) => <Card key={t}><div className="text-sm text-slate-500">{labelTier(t)}</div><div className="text-2xl font-bold">{perTier[t]}</div></Card>)}
        {SEMUA_AKTIVITAS.map((a) => <Card key={a}><div className="text-sm text-slate-500">{labelAktivitas(a)}</div><div className="text-2xl font-bold">{perAktivitas[a]}</div></Card>)}
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Tier × aktivitas</h2>
        <table className="w-full text-center text-sm">
          <thead><tr className="text-slate-500"><th className="p-2 text-left font-medium">Tier</th>{SEMUA_AKTIVITAS.map((a) => <th key={a} className="p-2 font-medium">{labelAktivitas(a)}</th>)}</tr></thead>
          <tbody className="divide-y">
            {[...SEMUA_TIER].reverse().map((t) => (
              <tr key={t}>
                <td className="p-2 text-left"><LencanaTier tier={t} /></td>
                {SEMUA_AKTIVITAS.map((a) => (
                  <td key={a} className="p-2">{matriks[t][a] > 0 ? <Link href={url(t, a)} className={WARNA_SEL(matriks[t][a])}>{matriks[t][a]}</Link> : <span className={WARNA_SEL(0)}>0</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <h2 className="text-lg font-semibold">Perlu dihubungi <span className="text-sm font-normal text-slate-500">(Silver/Gold yang mulai menjauh)</span></h2>
      <Table head={['Pelanggan', 'Tier', 'Aktivitas', 'Total belanja', 'Hari sejak belanja', 'Poin', '']}>
        {hubungi.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Tidak ada pelanggan bernilai yang berisiko hilang.</td></tr>}
        {hubungi.map((p) => {
          const wa = linkWhatsapp(p.telepon, `Halo ${p.nama}, sudah lama tidak mampir ke Toko Asri. Anda masih punya ${p.poin} poin. Kami tunggu kunjungannya ya!`)
          return (
            <tr key={p.id}>
              <td className="px-3 py-2 font-medium"><Link href={`/pelanggan/${p.id}`} className="text-sky-700 hover:underline">{p.nama}</Link></td>
              <td className="px-3 py-2"><LencanaTier tier={p.tier} /></td>
              <td className="px-3 py-2">{labelAktivitas(p.aktivitas)}</td>
              <td className="px-3 py-2">{formatRupiah(p.total_belanja)}</td>
              <td className="px-3 py-2">{p.hari_sejak_belanja ?? '–'}</td>
              <td className="px-3 py-2">{p.poin}</td>
              <td className="px-3 py-2">{wa ? <a href={wa} target="_blank" rel="noreferrer" className="rounded border px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50">WhatsApp</a> : <span className="text-xs text-slate-400">Tanpa telepon</span>}</td>
            </tr>
          )
        })}
      </Table>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Daftar pelanggan{terfilter ? ' (disaring)' : ''}</h2>
        {terfilter && <Link href="/pelanggan/segmen" className="rounded border px-3 py-1 text-xs hover:bg-slate-50">Hapus filter</Link>}
      </div>
      <Table head={['Pelanggan', 'Tier', 'Aktivitas', 'Total belanja', 'Transaksi', 'Hari sejak belanja']}>
        {tampil.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Tidak ada pelanggan pada segmen ini.</td></tr>}
        {tampil.slice(0, BATAS_DAFTAR).map((p) => (
          <tr key={p.id}>
            <td className="px-3 py-2 font-medium"><Link href={`/pelanggan/${p.id}`} className="text-sky-700 hover:underline">{p.nama}</Link></td>
            <td className="px-3 py-2"><LencanaTier tier={p.tier} /></td>
            <td className="px-3 py-2">{labelAktivitas(p.aktivitas)}</td>
            <td className="px-3 py-2">{formatRupiah(p.total_belanja)}</td>
            <td className="px-3 py-2">{p.jumlah_transaksi}</td>
            <td className="px-3 py-2">{p.hari_sejak_belanja ?? '–'}</td>
          </tr>
        ))}
      </Table>
      {tampil.length > BATAS_DAFTAR && <p className="text-sm text-amber-700">Menampilkan {BATAS_DAFTAR} dari {tampil.length} pelanggan. Gunakan filter untuk menyempitkan.</p>}
    </div>
  )
}
