import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { bersihkanPencarian, polaTelepon } from '@/lib/pelanggan'
import { Banner, BarisKosong, Card, Field, LencanaTier, PageHeader, Table, btnCls, btnGhostCls, inputCls, pilCls } from '@/components/ui'
import { simpanPelanggan, ubahAktifPelanggan } from './actions'

type SP = { q?: string; tier?: string; edit?: string; error?: string; ok?: string }
const TIERS = ['reguler', 'silver', 'gold'] as const
const BATAS = 100

export default async function PelangganPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { q = '', tier, edit, error, ok } = await searchParams
  const supabase = await createClient()
  const cari = bersihkanPencarian(q)
  const filterTier = TIERS.find((t) => t === tier)

  let kueri = supabase.from('customers')
    .select('id, nama, telepon, email, alamat, catatan, aktif, poin, total_belanja, jumlah_transaksi, terakhir_belanja, tier')
    .order('nama').limit(BATAS)
  if (cari) {
    const tel = polaTelepon(cari)
    kueri = kueri.or(tel.length >= 3 ? `nama.ilike.%${cari}%,telepon.ilike.%${tel}%` : `nama.ilike.%${cari}%`)
  }
  if (filterTier) kueri = kueri.eq('tier', filterTier)
  const { data: daftar } = await kueri
  const sedangDiubah = edit
    ? (daftar ?? []).find((c) => c.id === edit) ?? (await supabase.from('customers').select('*').eq('id', edit).maybeSingle()).data
    : null

  const urlTier = (t?: string) => `/pelanggan?${new URLSearchParams({ ...(cari ? { q: cari } : {}), ...(t ? { tier: t } : {}) })}`
  return (
    <div className="space-y-4">
      <PageHeader title="Pelanggan" subtitle="Data pelanggan, poin, dan tier loyalitas. 1 poin per Rp10.000; Silver mulai Rp500.000, Gold mulai Rp2.000.000 total belanja." />
      <Banner error={error} ok={ok} />
      <Card>
        <form action={simpanPelanggan} key={sedangDiubah?.id ?? 'baru'} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" defaultValue={sedangDiubah?.id ?? ''} />
          <Field label="Nama *"><input name="nama" required defaultValue={sedangDiubah?.nama} className={inputCls} /></Field>
          <Field label="Telepon / WhatsApp"><input name="telepon" inputMode="tel" defaultValue={sedangDiubah?.telepon ?? ''} placeholder="0812…" className={inputCls} /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={sedangDiubah?.email ?? ''} className={inputCls} /></Field>
          <Field label="Alamat"><input name="alamat" defaultValue={sedangDiubah?.alamat ?? ''} className={inputCls} /></Field>
          <div className="sm:col-span-2"><Field label="Catatan"><input name="catatan" defaultValue={sedangDiubah?.catatan ?? ''} className={inputCls} /></Field></div>
          <div className="flex gap-2 sm:col-span-2">
            <button className={btnCls}>{sedangDiubah ? 'Simpan perubahan' : 'Tambah pelanggan'}</button>
            {sedangDiubah && <Link href="/pelanggan" className={btnGhostCls + ' self-center'}>Batal</Link>}
          </div>
        </form>
      </Card>

      <form className="flex flex-wrap items-end gap-2">
        <Field label="Cari nama atau telepon"><input name="q" defaultValue={cari} className={inputCls + ' w-64'} /></Field>
        {filterTier && <input type="hidden" name="tier" value={filterTier} />}
        <button className={btnCls}>Cari</button>
      </form>
      <div className="flex gap-2">
        {[undefined, ...TIERS].map((t) => (
          <Link key={t ?? 'semua'} href={urlTier(t)}
            className={pilCls(filterTier === t)}>{t ? t[0].toUpperCase() + t.slice(1) : 'Semua tier'}</Link>
        ))}
      </div>

      <Table head={['Nama', 'Telepon', 'Tier', 'Poin', 'Total belanja', 'Transaksi', 'Belanja terakhir', '']}>
        {(daftar ?? []).length === 0 && <BarisKosong colSpan={8}>Tidak ada pelanggan yang cocok.</BarisKosong>}
        {(daftar ?? []).map((c) => (
          <tr key={c.id} className={c.aktif ? '' : 'text-slate-400'}>
            <td className="px-3 py-2 font-medium"><Link href={`/pelanggan/${c.id}`} className="text-brand-700 hover:underline">{c.nama}</Link>{!c.aktif && <span className="ml-2 text-xs">(nonaktif)</span>}</td>
            <td className="px-3 py-2">{c.telepon ?? '–'}</td>
            <td className="px-3 py-2"><LencanaTier tier={c.tier} /></td>
            <td className="px-3 py-2">{c.poin}</td>
            <td className="px-3 py-2">{formatRupiah(Number(c.total_belanja))}</td>
            <td className="px-3 py-2">{c.jumlah_transaksi}</td>
            <td className="px-3 py-2">{c.terakhir_belanja ? formatTanggal(c.terakhir_belanja) : '–'}</td>
            <td className="flex gap-2 px-3 py-2">
              <Link href={`/pelanggan?edit=${c.id}`} className={btnGhostCls}>Ubah</Link>
              <form action={ubahAktifPelanggan}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="aktif" value={String(!c.aktif)} />
                <button className={btnGhostCls}>{c.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      {(daftar ?? []).length >= BATAS && <p className="text-sm text-amber-700">Menampilkan {BATAS} pelanggan pertama. Persempit pencarian untuk melihat sisanya.</p>}
    </div>
  )
}
