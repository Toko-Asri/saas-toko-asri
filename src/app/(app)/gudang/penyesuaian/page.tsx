import { createClient } from '@/lib/supabase/server'
import { expiryStatus, hariIniJakarta } from '@/lib/expiry'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Banner, PageHeader, Table, btnGhostCls, inputCls } from '@/components/ui'
import { sesuaikanStok } from './actions'

const waktu = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export default async function PenyesuaianPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams
  const supabase = await createClient()
  const [{ data: batch }, { data: riwayat }] = await Promise.all([
    supabase.from('batches').select('id, kode_batch, qty, tgl_kedaluwarsa, products(nama, satuan), storage_locations(nama)')
      .gt('qty', 0).order('tgl_kedaluwarsa'),
    supabase.from('stock_adjustments')
      .select('id, qty_sebelum, qty_sesudah, alasan, catatan, nilai, created_at, batches(kode_batch), products(nama)')
      .order('created_at', { ascending: false }).limit(20),
  ])
  const hariIni = hariIniJakarta()
  return (
    <div className="space-y-4">
      <PageHeader title="Penyesuaian Stok" subtitle="Catat barang rusak, dibuang karena kedaluwarsa, hilang, atau koreksi hasil stok opname. Setiap perubahan tercatat sebagai riwayat." />
      <Banner error={error} ok={ok} />
      <Table head={['Produk', 'Batch', 'Lokasi', 'Qty', 'Kedaluwarsa', 'Sesuaikan']}>
        {(batch ?? []).map((b) => {
          const prod = b.products as unknown as { nama: string; satuan: string } | null
          const lok = b.storage_locations as unknown as { nama: string } | null
          const kadaluarsa = expiryStatus(b.tgl_kedaluwarsa, hariIni) === 'kedaluwarsa'
          return (
            <tr key={b.id} className={kadaluarsa ? 'bg-red-50' : ''}>
              <td className="px-3 py-2 font-medium">{prod?.nama}</td>
              <td className="px-3 py-2 font-mono text-xs">{b.kode_batch}</td>
              <td className="px-3 py-2">{lok?.nama}</td>
              <td className="px-3 py-2">{b.qty} {prod?.satuan}</td>
              <td className="px-3 py-2">{formatTanggal(b.tgl_kedaluwarsa)}{kadaluarsa && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Kedaluwarsa</span>}</td>
              <td className="px-3 py-2">
                <form action={sesuaikanStok} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="batch_id" value={b.id} />
                  <input name="qty_baru" type="number" min={0} step={1} required placeholder="Qty baru" aria-label={`Qty baru ${b.kode_batch}`} className={inputCls + ' w-24'} />
                  <select name="alasan" defaultValue={kadaluarsa ? 'kedaluwarsa' : 'rusak'} className={inputCls + ' w-32'} aria-label="Alasan">
                    <option value="rusak">Rusak</option><option value="kedaluwarsa">Kedaluwarsa</option>
                    <option value="hilang">Hilang</option><option value="koreksi">Koreksi</option>
                  </select>
                  <input name="catatan" placeholder="Catatan" className={inputCls + ' w-36'} aria-label="Catatan" />
                  <button className={btnGhostCls}>Simpan</button>
                </form>
                {kadaluarsa && (
                  <form action={sesuaikanStok} className="mt-1">
                    <input type="hidden" name="batch_id" value={b.id} /><input type="hidden" name="qty_baru" value="0" /><input type="hidden" name="alasan" value="kedaluwarsa" />
                    <button className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-100">Buang semua ({b.qty})</button>
                  </form>
                )}
              </td>
            </tr>
          )
        })}
      </Table>
      <h2 className="text-lg font-semibold">Riwayat penyesuaian terakhir</h2>
      <Table head={['Waktu', 'Produk', 'Batch', 'Perubahan', 'Alasan', 'Nilai', 'Catatan']}>
        {(riwayat ?? []).length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Belum ada penyesuaian.</td></tr>}
        {(riwayat ?? []).map((r) => (
          <tr key={r.id}>
            <td className="px-3 py-2">{waktu.format(new Date(r.created_at))}</td>
            <td className="px-3 py-2">{(r.products as unknown as { nama: string } | null)?.nama}</td>
            <td className="px-3 py-2 font-mono text-xs">{(r.batches as unknown as { kode_batch: string } | null)?.kode_batch}</td>
            <td className="px-3 py-2">{r.qty_sebelum} → {r.qty_sesudah}</td>
            <td className="px-3 py-2 capitalize">{r.alasan}</td>
            <td className={`px-3 py-2 ${Number(r.nilai) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{Number(r.nilai) > 0 ? '−' : '+'}{formatRupiah(Math.abs(Number(r.nilai)))}</td>
            <td className="px-3 py-2">{r.catatan}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
