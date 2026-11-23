import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { tindakanPerluDiambil } from '@/lib/dashboard'
import { menuFor } from '@/lib/roles'
import { Banner, Stat } from '@/components/ui'

const WARNA = { mendesak: 'border-red-300 bg-red-50 text-red-900', perlu: 'border-amber-300 bg-amber-50 text-amber-900', info: 'border-brand-200 bg-brand-50 text-brand-900' } as const
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
  const menu = menuFor('staf_gudang').filter((m) => m.href !== '/')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Halo, {nama}</h1>
        <p className="text-sm text-slate-500">Ringkasan gudang dan rantai pasok</p>
      </div>
      <Banner error={error?.message} />
      <section aria-label="Perlu tindakan" className="space-y-2">
        <h2 className="text-lg font-semibold">Perlu tindakan</h2>
        {tindakan.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Semua beres: tidak ada yang perlu ditindaklanjuti saat ini.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {tindakan.map((t) => <Link key={t.kode} href={t.tautan} className={`rounded-lg border p-3 text-sm hover:shadow-sm ${WARNA[t.tingkat]}`}>{t.teks} →</Link>)}
          </div>
        )}
      </section>
      {s && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat judul={<>Produk aktif</>}>{s.produk_aktif}</Stat>
          <Stat judul={<>Di bawah stok minimum</>} nada="peringatan">{s.produk_di_bawah_minimum}</Stat>
          <Stat judul={<>Batch kedaluwarsa</>} nada="bahaya">{s.batch_kedaluwarsa}</Stat>
          <Stat judul={<>PO menunggu barang</>}>{s.po_menunggu}</Stat>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((m) => <Link key={m.href} href={m.href} className="rounded-lg border bg-white p-4 font-medium hover:border-brand-500">{m.label}</Link>)}
      </div>
    </div>
  )
}
