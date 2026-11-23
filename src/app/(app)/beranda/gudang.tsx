import Link from 'next/link'
import { CalendarX2, Hourglass, PackageMinus, Boxes } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { tindakanPerluDiambil } from '@/lib/dashboard'
import { kelompokMenu } from '@/lib/nav'
import { menuFor } from '@/lib/roles'
import { Banner, KpiCard } from '@/components/ui'
import { PerluTindakan } from '@/components/perlu-tindakan'
import { IkonMenu } from '@/components/shell/ikon'

type Stok = {
  produk_aktif: number; produk_di_bawah_minimum: number; produk_habis: number; saran_terbuka: number
  batch_hampir_kedaluwarsa: number; batch_kedaluwarsa: number; po_menunggu: number
}

// Beranda staf gudang: hanya hitungan stok/pembelian. Kolom nilai rupiah (berbasis biaya) bernilai null untuk peran ini
// dan tidak dibaca; tidak ada data penjualan atau pelanggan.
export async function BerandaGudang({ nama }: { nama: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('dashboard_stok')
  const s = (data as Stok[] | null)?.[0]
  const tindakan = tindakanPerluDiambil({
    saranTerbuka: s?.saran_terbuka ?? 0, batchKedaluwarsa: s?.batch_kedaluwarsa ?? 0, batchHampir: s?.batch_hampir_kedaluwarsa ?? 0,
    poMenunggu: s?.po_menunggu ?? 0, produkHabis: s?.produk_habis ?? 0, pelangganPerluDihubungi: 0, integritasMasalah: 0,
  })
  const pintasan = kelompokMenu(menuFor('staf_gudang')).filter((g) => g.judul === 'Gudang & Pasokan').flatMap((g) => g.item)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.7rem]">Halo, {nama}</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan gudang dan rantai pasok</p>
      </div>
      <Banner error={error?.message} />
      <PerluTindakan tindakan={tindakan} />
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard indeks={1} judul="Produk aktif" nilai={String(s.produk_aktif)} ikon={<Boxes className="size-5" />} />
          <KpiCard indeks={2} judul="Di bawah stok minimum" nilai={String(s.produk_di_bawah_minimum)} ikon={<PackageMinus className="size-5" />} nada="peringatan" />
          <KpiCard indeks={3} judul="Batch kedaluwarsa" nilai={String(s.batch_kedaluwarsa)} ikon={<CalendarX2 className="size-5" />} nada="bahaya" />
          <KpiCard indeks={4} judul="PO menunggu barang" nilai={String(s.po_menunggu)} ikon={<Hourglass className="size-5" />} />
        </div>
      )}
      <h2 className="text-lg font-bold text-slate-900">Pintasan</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pintasan.map((m, i) => (
          <Link key={m.href} href={m.href} style={{ '--i': i } as React.CSSProperties}
            className="reveal group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 font-semibold text-slate-800 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop">
            <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100"><IkonMenu nama={m.ikon} /></span>
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
