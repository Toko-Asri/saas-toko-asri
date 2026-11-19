import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/format'
import { labelPerubahan, perubahan, tindakanPerluDiambil, waktuRelatif, type Tindakan } from '@/lib/dashboard'
import { labelAktivitas, labelTier } from '@/lib/loyalty'
import { rentangPeriode, type KodePeriode } from '@/lib/periode'
import { hitungSegmen, perluDihubungi, SEMUA_AKTIVITAS, SEMUA_TIER, type BarisSegmen } from '@/lib/segmen'
import { Banner, Card, LencanaTier, Table } from '@/components/ui'
import { GrafikHarian, type TitikHarian } from '@/components/grafik'

export const PERIODE: { kode: KodePeriode; label: string }[] = [
  { kode: 'hari-ini', label: 'Hari ini' },
  { kode: '7-hari', label: '7 hari' },
  { kode: '30-hari', label: '30 hari' },
  { kode: 'bulan-ini', label: 'Bulan ini' },
]

const IKON: Record<string, string> = { penjualan: '🛒', penyesuaian_stok: '📦', saran_pembelian: '💡', po_dibuat: '🚚', pelanggan_baru: '👤' }
const WARNA_TINDAKAN: Record<Tindakan['tingkat'], string> = {
  mendesak: 'border-red-300 bg-red-50 text-red-900',
  perlu: 'border-amber-300 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
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

function Kpi({ judul, nilai, ubah }: { judul: string; nilai: string; ubah?: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{judul}</div>
      <div className="text-2xl font-bold">{nilai}</div>
      {ubah && <div className="text-xs text-slate-500">{ubah} vs periode sebelumnya</div>}
    </Card>
  )
}

function Panel({ judul, tautan, galat, children }: { judul: string; tautan?: { href: string; label: string }; galat?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{judul}</h2>
        {tautan && <Link href={tautan.href} className="text-xs text-sky-700 hover:underline">{tautan.label} →</Link>}
      </div>
      {galat ? <Banner error={galat} /> : children}
    </Card>
  )
}

const Baris = ({ label, nilai, href }: { label: string; nilai: ReactNode; href?: string }) => (
  <div className="flex justify-between gap-3 py-0.5 text-sm">
    <span className="text-slate-500">{href ? <Link href={href} className="hover:underline">{label}</Link> : label}</span>
    <span className="font-medium">{nilai}</span>
  </div>
)

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Halo, {nama}</h1>
          <p className="text-sm text-slate-500">Ringkasan toko · {dari === sampai ? dari : `${dari} s/d ${sampai}`} (WIB)</p>
        </div>
        <div className="flex gap-2">
          {PERIODE.map((x) => (
            <Link key={x.kode} href={`/?p=${x.kode}`} className={`rounded-full border px-3 py-1 text-xs ${periode === x.kode ? 'bg-sky-700 text-white' : 'bg-white hover:bg-slate-50'}`}>{x.label}</Link>
          ))}
        </div>
      </div>

      <section aria-label="Perlu tindakan" className="space-y-2">
        <h2 className="text-lg font-semibold">Perlu tindakan</h2>
        {tindakan.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Semua beres: tidak ada yang perlu ditindaklanjuti saat ini.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {tindakan.map((t) => (
              <Link key={t.kode} href={t.tautan} className={`rounded-lg border p-3 text-sm hover:shadow-sm ${WARNA_TINDAKAN[t.tingkat]}`}>{t.teks} →</Link>
            ))}
          </div>
        )}
      </section>

      <Banner error={rg.error?.message} />
      {r && (
        <section aria-label="Ringkasan penjualan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi judul="Penjualan" nilai={formatRupiah(num(r.penjualan))} ubah={labelPerubahan(perubahan(num(r.penjualan), num(r.penjualan_sebelumnya)))} />
          <Kpi judul="Laba kotor" nilai={formatRupiah(num(r.laba_kotor))} ubah={labelPerubahan(perubahan(num(r.laba_kotor), num(r.laba_sebelumnya)))} />
          <Kpi judul="Transaksi" nilai={String(r.transaksi)} ubah={labelPerubahan(perubahan(r.transaksi, r.transaksi_sebelumnya))} />
          <Kpi judul="Rata-rata per transaksi" nilai={formatRupiah(num(r.rata_transaksi))} />
          <Kpi judul="Transaksi berpelanggan" nilai={`${porsiMember}%`} />
          <Kpi judul="Pelanggan baru" nilai={String(r.pelanggan_baru)} />
          <Kpi judul="Kerugian stok" nilai={formatRupiah(num(r.kerugian_stok))} />
          <Kpi judul="Laba setelah kerugian" nilai={formatRupiah(num(r.laba_kotor) - num(r.kerugian_stok))} />
        </section>
      )}

      <GrafikHarian data={harian} judul={`Penjualan dan laba kotor per hari (${grafik.dari === grafik.sampai ? grafik.dari : `${grafik.dari} s/d ${grafik.sampai}`})`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel judul="Stok dan rantai pasok" tautan={{ href: '/gudang/inventori', label: 'Inventori' }} galat={st.error?.message}>
          {s && <>
            <Baris label="Nilai persediaan (layak jual)" nilai={formatRupiah(num(s.nilai_persediaan))} />
            <Baris label="Nilai stok kedaluwarsa" nilai={formatRupiah(num(s.nilai_kedaluwarsa))} href="/gudang/penyesuaian" />
            <Baris label="Produk di bawah stok minimum" nilai={`${s.produk_di_bawah_minimum} dari ${s.produk_aktif}`} href="/gudang/saran" />
            <Baris label="Produk habis (stok layak 0)" nilai={s.produk_habis} href="/gudang/inventori" />
            <Baris label="Batch hampir kedaluwarsa (≤ 14 hari)" nilai={`${s.batch_hampir_kedaluwarsa} · ${formatRupiah(num(s.nilai_hampir_kedaluwarsa))}`} href="/gudang/inventori?f=hampir" />
            <Baris label="Pesanan pembelian menunggu" nilai={`${s.po_menunggu} · ${formatRupiah(num(s.nilai_po_menunggu))}`} href="/gudang/pembelian" />
          </>}
        </Panel>

        <Panel judul="Pelanggan" tautan={{ href: '/pelanggan/segmen', label: 'Segmentasi' }} galat={sg.error?.message}>
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {SEMUA_TIER.map((t) => <span key={t} className="rounded border px-2 py-0.5">{labelTier(t)}: <b>{perTier[t]}</b></span>)}
            {SEMUA_AKTIVITAS.map((a) => <span key={a} className="rounded border px-2 py-0.5">{labelAktivitas(a)}: <b>{perAktivitas[a]}</b></span>)}
          </div>
          <h3 className="mb-1 text-sm font-medium text-slate-600">Pelanggan teratas periode ini</h3>
          {tp.error ? <Banner error={tp.error.message} /> : teratas.length === 0 ? <p className="text-sm text-slate-500">Belum ada penjualan berpelanggan pada periode ini.</p> : (
            <ul className="divide-y text-sm">
              {teratas.map((t) => (
                <li key={t.customer_id} className="flex items-center justify-between gap-2 py-1">
                  <span><Link href={`/pelanggan/${t.customer_id}`} className="font-medium text-sky-700 hover:underline">{t.nama}</Link> <LencanaTier tier={t.tier} /></span>
                  <span className="text-slate-600">{formatRupiah(num(t.belanja))} · {t.transaksi}×</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel judul="Produk teratas berdasarkan laba kotor" tautan={{ href: '/laporan', label: 'Laporan' }} galat={pr.error?.message}>
        {produk.length === 0 ? <p className="text-sm text-slate-500">Belum ada penjualan pada periode ini.</p> : (
          <Table head={['Produk', 'Terjual', 'Penjualan', 'Laba kotor']}>
            {produk.map((p) => (
              <tr key={p.product_id}>
                <td className="px-3 py-2 font-medium">{p.nama}</td><td className="px-3 py-2">{num(p.qty_terjual)}</td>
                <td className="px-3 py-2">{formatRupiah(num(p.penjualan))}</td><td className="px-3 py-2 font-semibold text-emerald-700">{formatRupiah(num(p.laba_kotor))}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel judul="Aktivitas terbaru lintas modul" galat={ak.error?.message}>
        {aktivitas.length === 0 ? <p className="text-sm text-slate-500">Belum ada aktivitas.</p> : (
          <ul className="divide-y text-sm">
            {aktivitas.map((a, n) => (
              <li key={n}>
                <Link href={a.tautan} className="flex items-start gap-3 py-2 hover:bg-slate-50">
                  <span aria-hidden className="w-5 text-center">{IKON[a.jenis] ?? '•'}</span>
                  <span className="flex-1"><span className="font-medium">{a.judul}</span><span className="block text-slate-500">{a.rincian}</span></span>
                  <span className="whitespace-nowrap text-xs text-slate-400">{waktuRelatif(a.waktu)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section id="integritas" aria-label="Integritas data">
        <Panel judul="Integritas data lintas modul" galat={ig.error?.message}>
          <p className="mb-2 text-xs text-slate-500">Memeriksa bahwa poin pelanggan, total penjualan, stok, penerimaan PO, dan saran pembelian saling cocok.</p>
          <ul className="space-y-1 text-sm">
            {integritas.map((x) => (
              <li key={x.kode} className={x.ok ? '' : 'rounded bg-red-50 p-2 text-red-800'}>
                <span aria-hidden>{x.ok ? '✓' : '✗'}</span> {x.nama}
                {!x.ok && <span className="block text-xs">{x.jumlah_masalah} masalah{x.contoh ? ` · contoh: ${x.contoh}` : ''}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  )
}
