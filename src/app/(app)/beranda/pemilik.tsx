import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ArrowUpRight, Calculator, CircleDollarSign, ClipboardCheck, Clock, Coins, Lightbulb, PackageX,
  PiggyBank, Receipt, ShieldAlert, ShieldCheck, ShoppingCart, Truck, UserPlus, Users, Wallet,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { perubahan, tindakanPerluDiambil, waktuRelatif } from '@/lib/dashboard'
import { labelAktivitas, labelTier } from '@/lib/loyalty'
import { rentangPeriode, type KodePeriode } from '@/lib/periode'
import { hitungSegmen, perluDihubungi, SEMUA_AKTIVITAS, SEMUA_TIER, type BarisSegmen } from '@/lib/segmen'
import { inisial } from '@/lib/nav'
import { Badge, Banner, EmptyState, KpiCard, LencanaTier, Table } from '@/components/ui'
import { GrafikHarian, type TitikHarian } from '@/components/grafik'
import { Tren } from '@/components/tren'
import { PerluTindakan } from '@/components/perlu-tindakan'

export const PERIODE: { kode: KodePeriode; label: string }[] = [
  { kode: 'hari-ini', label: 'Hari ini' },
  { kode: '7-hari', label: '7 hari' },
  { kode: '30-hari', label: '30 hari' },
  { kode: 'bulan-ini', label: 'Bulan ini' },
]

// Ikon dan warna aktivitas lintas modul (jenis berasal dari database; hanya tampilannya yang diatur di sini).
const AKTIVITAS: Record<string, { ikon: ReactNode; warna: string }> = {
  penjualan: { ikon: <ShoppingCart className="size-4" />, warna: 'bg-brand-50 text-brand-700' },
  penyesuaian_stok: { ikon: <ClipboardCheck className="size-4" />, warna: 'bg-amber-50 text-amber-700' },
  saran_pembelian: { ikon: <Lightbulb className="size-4" />, warna: 'bg-mint-50 text-mint-700' },
  po_dibuat: { ikon: <Truck className="size-4" />, warna: 'bg-slate-100 text-slate-700' },
  pelanggan_baru: { ikon: <UserPlus className="size-4" />, warna: 'bg-violet-50 text-violet-700' },
}

type Ringkasan = {
  penjualan: number; hpp: number; laba_kotor: number; transaksi: number; transaksi_member: number; rata_transaksi: number
  kerugian_stok: number; penjualan_sebelumnya: number; laba_sebelumnya: number; transaksi_sebelumnya: number; pelanggan_baru: number
}
type Stok = {
  nilai_persediaan: number; nilai_kedaluwarsa: number; produk_aktif: number; produk_di_bawah_minimum: number; produk_habis: number
  saran_terbuka: number; batch_hampir_kedaluwarsa: number; nilai_hampir_kedaluwarsa: number; batch_kedaluwarsa: number
  po_menunggu: number; nilai_po_menunggu: number
}
type Teratas = { customer_id: string; nama: string; tier: 'reguler' | 'silver' | 'gold'; transaksi: number; belanja: number; poin: number }
type Aktivitas = { waktu: string; jenis: string; judul: string; rincian: string; tautan: string }
type ProdukLaporan = { product_id: string; nama: string; qty_terjual: number; penjualan: number; laba_kotor: number }
type Integritas = { kode: string; nama: string; ok: boolean; jumlah_masalah: number; contoh: string }


const num = (v: unknown) => Number(v ?? 0)

function Panel({ judul, ikon, tautan, galat, children, className = '', indeks = 0 }: {
  judul: string; ikon?: ReactNode; tautan?: { href: string; label: string }; galat?: string; children: ReactNode; className?: string; indeks?: number
}) {
  return (
    <section className={`reveal rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card md:p-5 ${className}`} style={{ '--i': indeks } as React.CSSProperties}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">{ikon && <span aria-hidden className="text-brand-600">{ikon}</span>}{judul}</h2>
        {tautan && <Link href={tautan.href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700 hover:underline">{tautan.label}<ArrowUpRight aria-hidden className="size-3.5" /></Link>}
      </div>
      {galat ? <Banner error={galat} /> : children}
    </section>
  )
}

const Baris = ({ label, nilai, href }: { label: string; nilai: ReactNode; href?: string }) => {
  const isi = (
    <>
      <span className="min-w-0 text-slate-500">{label}</span>
      <span className="tabular shrink-0 whitespace-nowrap font-semibold text-slate-900">{nilai}</span>
    </>
  )
  const cls = 'flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm'
  return href
    ? <Link href={href} className={`${cls} transition hover:bg-brand-50`}>{isi}</Link>
    : <div className={cls}>{isi}</div>
}

export async function BerandaPemilik({ periode, nama }: { periode: KodePeriode; nama: string }) {
  const supabase = await createClient()
  const { dari, sampai } = rentangPeriode(periode)
  // Grafik minimal 7 hari agar tidak hanya satu batang pada periode "hari ini"
  const grafik = periode === 'hari-ini' ? rentangPeriode('7-hari') : { dari, sampai }

  const [rg, st, hr, pr, tp, ak, ig, sg] = await Promise.all([
    supabase.rpc('dashboard_ringkasan', { p_dari: dari, p_sampai: sampai }),
    supabase.rpc('dashboard_stok'),
    supabase.rpc('laporan_keuangan', { p_dari: grafik.dari, p_sampai: grafik.sampai }),
    supabase.rpc('laporan_produk', { p_dari: dari, p_sampai: sampai }),
    supabase.rpc('pelanggan_teratas', { p_dari: dari, p_sampai: sampai, p_limit: 5 }),
    supabase.rpc('aktivitas_terbaru', { p_limit: 15 }),
    supabase.rpc('cek_integritas'),
    supabase.from('pelanggan_segmen').select('id, nama, telepon, tier, aktivitas, poin, total_belanja, jumlah_transaksi, hari_sejak_belanja').limit(5000),
  ])

  const r = (rg.data as Ringkasan[] | null)?.[0]
  const s = (st.data as Stok[] | null)?.[0]
  const harian: TitikHarian[] = ((hr.data as TitikHarian[] | null) ?? []).map((x) => ({ ...x, penjualan: num(x.penjualan), laba_kotor: num(x.laba_kotor) }))
  const produk = ((pr.data as ProdukLaporan[] | null) ?? []).slice(0, 5)
  const teratas = (tp.data as Teratas[] | null) ?? []
  const aktivitas = (ak.data as Aktivitas[] | null) ?? []
  const integritas = (ig.data as Integritas[] | null) ?? []
  const segmenRows: BarisSegmen[] = ((sg.data ?? []) as BarisSegmen[]).map((x) => ({ ...x, total_belanja: num(x.total_belanja), poin: num(x.poin) }))
  const { perTier, perAktivitas } = hitungSegmen(segmenRows)
  const hubungi = perluDihubungi(segmenRows)
  const integritasMasalah = integritas.filter((x) => !x.ok).length

  const tindakan = tindakanPerluDiambil({
    saranTerbuka: num(s?.saran_terbuka), batchKedaluwarsa: num(s?.batch_kedaluwarsa), batchHampir: num(s?.batch_hampir_kedaluwarsa),
    poMenunggu: num(s?.po_menunggu), pelangganPerluDihubungi: hubungi.length, produkHabis: num(s?.produk_habis), integritasMasalah,
  })
  const porsiMember = r && r.transaksi > 0 ? Math.round((r.transaksi_member / r.transaksi) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.7rem]">Halo, {nama}</h1>
          <p className="mt-1 text-sm text-slate-500">Ringkasan toko · {dari === sampai ? dari : `${dari} s/d ${sampai}`} (WIB)</p>
        </div>
        <nav aria-label="Periode" className="inline-flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-card">
          {PERIODE.map((x) => (
            <Link key={x.kode} href={`/?p=${x.kode}`} aria-current={periode === x.kode ? 'true' : undefined}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${periode === x.kode ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{x.label}</Link>
          ))}
        </nav>
      </div>

      <PerluTindakan tindakan={tindakan} />

      <Banner error={rg.error?.message} />
      {r && (
        <section aria-label="Ringkasan penjualan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard indeks={1} judul="Penjualan" nilai={formatRupiah(num(r.penjualan))} ikon={<Wallet className="size-5" />}
            keterangan={<span className="inline-flex items-center gap-1.5"><Tren p={perubahan(num(r.penjualan), num(r.penjualan_sebelumnya))} /> vs periode sebelumnya</span>} />
          <KpiCard indeks={2} judul="Laba kotor" nilai={formatRupiah(num(r.laba_kotor))} ikon={<Coins className="size-5" />} nada="sukses"
            keterangan={<span className="inline-flex items-center gap-1.5"><Tren p={perubahan(num(r.laba_kotor), num(r.laba_sebelumnya))} /> vs periode sebelumnya</span>} />
          <KpiCard indeks={3} judul="Transaksi" nilai={String(r.transaksi)} ikon={<Receipt className="size-5" />}
            keterangan={<span className="inline-flex items-center gap-1.5"><Tren p={perubahan(r.transaksi, r.transaksi_sebelumnya)} /> vs periode sebelumnya</span>} />
          <KpiCard indeks={4} judul="Rata-rata per transaksi" nilai={formatRupiah(num(r.rata_transaksi))} ikon={<Calculator className="size-5" />} />
          <KpiCard indeks={5} judul="Transaksi berpelanggan" nilai={`${porsiMember}%`} ikon={<Users className="size-5" />} keterangan={`${r.transaksi_member} dari ${r.transaksi} transaksi`} />
          <KpiCard indeks={6} judul="Pelanggan baru" nilai={String(r.pelanggan_baru)} ikon={<UserPlus className="size-5" />} />
          <KpiCard indeks={7} judul="Kerugian stok" nilai={formatRupiah(num(r.kerugian_stok))} ikon={<PackageX className="size-5" />} nada="bahaya" keterangan="Rusak, kedaluwarsa, hilang" />
          <KpiCard indeks={8} judul="Laba setelah kerugian" nilai={formatRupiah(num(r.laba_kotor) - num(r.kerugian_stok))} ikon={<PiggyBank className="size-5" />} nada={num(r.laba_kotor) - num(r.kerugian_stok) < 0 ? 'bahaya' : 'sukses'} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><GrafikHarian data={harian} judul={`Penjualan dan laba kotor per hari (${grafik.dari === grafik.sampai ? grafik.dari : `${grafik.dari} s/d ${grafik.sampai}`})`} /></div>
        <Panel indeks={9} judul="Stok dan rantai pasok" ikon={<Truck className="size-4" />} tautan={{ href: '/gudang/inventori', label: 'Inventori' }} galat={st.error?.message}>
          {s && <div className="-mx-2 divide-y divide-slate-100">
            <Baris label="Nilai persediaan (layak jual)" nilai={formatRupiah(num(s.nilai_persediaan))} />
            <Baris label="Nilai stok kedaluwarsa" nilai={formatRupiah(num(s.nilai_kedaluwarsa))} href="/gudang/penyesuaian" />
            <Baris label="Produk di bawah stok minimum" nilai={`${s.produk_di_bawah_minimum} dari ${s.produk_aktif}`} href="/gudang/saran" />
            <Baris label="Produk habis (stok layak 0)" nilai={s.produk_habis} href="/gudang/inventori" />
            <Baris label="Batch hampir kedaluwarsa (≤ 14 hari)" nilai={`${s.batch_hampir_kedaluwarsa} · ${formatRupiah(num(s.nilai_hampir_kedaluwarsa))}`} href="/gudang/inventori?f=hampir" />
            <Baris label="Pesanan pembelian menunggu" nilai={`${s.po_menunggu} · ${formatRupiah(num(s.nilai_po_menunggu))}`} href="/gudang/pembelian" />
          </div>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel indeks={10} judul="Pelanggan" ikon={<Users className="size-4" />} tautan={{ href: '/pelanggan/segmen', label: 'Segmentasi' }} galat={sg.error?.message}>
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
            {SEMUA_TIER.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{labelTier(t)} <b className="tabular">{perTier[t]}</b></span>)}
            {SEMUA_AKTIVITAS.map((a) => <span key={a} className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-800">{labelAktivitas(a)} <b className="tabular">{perAktivitas[a]}</b></span>)}
          </div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Teratas periode ini</h3>
          {tp.error ? <Banner error={tp.error.message} /> : teratas.length === 0 ? <p className="py-3 text-sm text-slate-500">Belum ada penjualan berpelanggan pada periode ini.</p> : (
            <ul className="divide-y divide-slate-100">
              {teratas.map((t) => (
                <li key={t.customer_id} className="flex items-center gap-3 py-2">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-800">{inisial(t.nama)}</span>
                  <span className="min-w-0 flex-1"><Link href={`/pelanggan/${t.customer_id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700">{t.nama}</Link><LencanaTier tier={t.tier} /></span>
                  <span className="tabular text-right text-sm text-slate-600">{formatRupiah(num(t.belanja))}<span className="block text-xs text-slate-400">{t.transaksi}×</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel indeks={11} className="lg:col-span-2" judul="Produk teratas berdasarkan laba kotor" ikon={<CircleDollarSign className="size-4" />} tautan={{ href: '/laporan', label: 'Laporan' }} galat={pr.error?.message}>
          {produk.length === 0 ? <EmptyState judul="Belum ada penjualan" teks="Produk terlaba muncul setelah ada transaksi pada periode ini." /> : (
            <Table head={['Produk', 'Terjual', 'Penjualan', 'Laba kotor']}>
              {produk.map((p) => (
                <tr key={p.product_id}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{p.nama}</td><td className="tabular px-3 py-2.5">{num(p.qty_terjual)}</td>
                  <td className="tabular px-3 py-2.5">{formatRupiah(num(p.penjualan))}</td><td className="tabular px-3 py-2.5 font-semibold text-mint-700">{formatRupiah(num(p.laba_kotor))}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel indeks={12} className="lg:col-span-2" judul="Aktivitas terbaru lintas modul" ikon={<Clock className="size-4" />} galat={ak.error?.message}>
          {aktivitas.length === 0 ? <EmptyState judul="Belum ada aktivitas" /> : (
            <ul className="-mx-2 max-h-[30rem] divide-y divide-slate-100 overflow-y-auto pr-1">
              {aktivitas.map((a, n) => (
                <li key={n}>
                  <Link href={a.tautan} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-brand-50/60">
                    <span aria-hidden className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${AKTIVITAS[a.jenis]?.warna ?? 'bg-slate-100 text-slate-600'}`}>{AKTIVITAS[a.jenis]?.ikon}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{a.judul}</span><span className="block truncate text-sm text-slate-500">{a.rincian}</span></span>
                    <span className="whitespace-nowrap pt-0.5 text-xs text-slate-400">{waktuRelatif(a.waktu)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <section id="integritas" aria-label="Integritas data" className="scroll-mt-24">
          <Panel indeks={13} judul="Integritas data" ikon={integritasMasalah > 0 ? <ShieldAlert className="size-4 text-red-600" /> : <ShieldCheck className="size-4" />} galat={ig.error?.message}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Poin, penjualan, stok, PO, dan saran saling cocok.</p>
              <Badge nada={integritasMasalah > 0 ? 'bahaya' : 'sukses'}>{integritas.length - integritasMasalah}/{integritas.length} lolos</Badge>
            </div>
            <ul className="space-y-1.5 text-sm">
              {integritas.map((x) => (
                <li key={x.kode} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${x.ok ? 'text-slate-700' : 'bg-red-50 text-red-800'}`}>
                  <span aria-hidden className={`mt-0.5 ${x.ok ? 'text-mint-600' : 'text-red-600'}`}>{x.ok ? '✓' : '✗'}</span>
                  <span>{x.nama}{!x.ok && <span className="block text-xs">{x.jumlah_masalah} masalah{x.contoh ? ` · contoh: ${x.contoh}` : ''}</span>}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      </div>
    </div>
  )
}
