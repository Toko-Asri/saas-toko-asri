'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/format'
import { kembalian, keItemCheckout, tambah, total, ubahQty, type BarisKeranjang } from '@/lib/pos-cart'
import { btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { bayar } from './actions'

export type ProdukPos = { id: string; sku: string; nama: string; satuan: string; harga: number; stokLayak: number }
type Metode = 'tunai' | 'qris' | 'transfer'

export function Pos({ produk }: { produk: ProdukPos[] }) {
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [keranjang, setKeranjang] = useState<BarisKeranjang[]>([])
  const [metode, setMetode] = useState<Metode>('tunai')
  const [bayarStr, setBayarStr] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  // Kunci idempoten: dipakai ulang untuk kirim ulang isi yang sama (klik ganda / respons hilang),
  // diganti bila isi keranjang, metode, atau bayar berubah.
  const kunci = useRef<{ sidik: string; id: string } | null>(null)

  const totalBayar = total(keranjang)
  const jumlahBayar = metode === 'tunai' ? Number(bayarStr || 0) : totalBayar
  const kemb = kembalian(totalBayar, jumlahBayar)
  const bisaBayar = keranjang.length > 0 && !memproses && kemb !== null

  const q = cari.trim().toLowerCase()
  const tampil = produk.filter((p) => !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  const qtyDiKeranjang = (id: string) => keranjang.find((b) => b.productId === id)?.qty ?? 0

  function kunciUntuk(): string {
    const sidik = JSON.stringify([keItemCheckout(keranjang), metode, jumlahBayar])
    if (!kunci.current || kunci.current.sidik !== sidik) kunci.current = { sidik, id: crypto.randomUUID() }
    return kunci.current.id
  }

  async function prosesBayar() {
    if (!bisaBayar) return
    setMemproses(true)
    setGalat(null)
    try {
      const hasil = await bayar({ items: keItemCheckout(keranjang), metode, bayar: jumlahBayar, key: kunciUntuk() })
      if (hasil.error) { setGalat(hasil.error); return }
      kunci.current = null
      router.push(`/kasir/riwayat/${hasil.saleId}`)
    } catch {
      setGalat('Koneksi bermasalah. Periksa riwayat penjualan sebelum mencoba lagi; mencoba lagi dengan isi yang sama aman dari transaksi ganda.')
    } finally {
      setMemproses(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="space-y-3 lg:col-span-3">
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau SKU…" className={inputCls} aria-label="Cari produk" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tampil.map((p) => {
            const habis = p.stokLayak <= 0
            const penuh = qtyDiKeranjang(p.id) >= p.stokLayak
            return (
              <button key={p.id} type="button" disabled={habis || penuh}
                onClick={() => setKeranjang((k) => tambah(k, { productId: p.id, nama: p.nama, harga: p.harga, stokLayak: p.stokLayak }))}
                className="rounded-lg border bg-white p-3 text-left hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50">
                <div className="font-medium">{p.nama}</div>
                <div className="text-sm text-sky-800">{formatRupiah(p.harga)}</div>
                <div className={`text-xs ${habis ? 'text-red-600' : 'text-slate-500'}`}>{habis ? 'Stok habis' : `Stok layak jual: ${p.stokLayak} ${p.satuan}`}</div>
              </button>
            )
          })}
          {tampil.length === 0 && <p className="text-sm text-slate-500">Produk tidak ditemukan.</p>}
        </div>
      </section>

      <aside className="space-y-3 rounded-lg border bg-white p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Keranjang</h2>
        {keranjang.length === 0 && <p className="text-sm text-slate-500">Belum ada produk.</p>}
        <ul className="divide-y">
          {keranjang.map((b) => (
            <li key={b.productId} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex-1">
                <div className="font-medium">{b.nama}</div>
                <div className="text-slate-500">{formatRupiah(b.harga)} × {b.qty} = {formatRupiah(b.harga * b.qty)}</div>
              </div>
              <input type="number" min={0} max={b.stokLayak} value={b.qty} aria-label={`Jumlah ${b.nama}`}
                onChange={(e) => setKeranjang((k) => ubahQty(k, b.productId, Number(e.target.value)))} className={inputCls + ' w-16'} />
              <button type="button" onClick={() => setKeranjang((k) => ubahQty(k, b.productId, 0))} className={btnGhostCls} aria-label={`Hapus ${b.nama}`}>✕</button>
            </li>
          ))}
        </ul>

        <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span>{formatRupiah(totalBayar)}</span></div>

        <div className="flex gap-2">
          {(['tunai', 'qris', 'transfer'] as Metode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMetode(m)}
              className={`flex-1 rounded border px-2 py-1 text-sm capitalize ${metode === m ? 'bg-sky-700 text-white' : 'bg-white hover:bg-slate-50'}`}>{m}</button>
          ))}
        </div>

        {metode === 'tunai' ? (
          <div className="space-y-2">
            <label className="block text-sm">Uang diterima (Rp)
              <input type="number" min={0} step={500} value={bayarStr} onChange={(e) => setBayarStr(e.target.value)} className={inputCls} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhostCls} onClick={() => setBayarStr(String(totalBayar))}>Uang pas</button>
              {[20000, 50000, 100000].map((n) => <button key={n} type="button" className={btnGhostCls} onClick={() => setBayarStr(String(n))}>{formatRupiah(n)}</button>)}
            </div>
            <div className="flex justify-between text-sm"><span>Kembalian</span>
              <span className={kemb === null ? 'text-red-600' : 'font-semibold'}>{kemb === null ? 'Uang kurang' : formatRupiah(kemb)}</span></div>
          </div>
        ) : <p className="text-sm text-slate-500">Pembayaran {metode} dicatat sebesar total belanja.</p>}

        {galat && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{galat}</p>}
        <button type="button" onClick={prosesBayar} disabled={!bisaBayar} className={btnCls + ' w-full disabled:opacity-50'}>
          {memproses ? 'Memproses…' : `Bayar ${formatRupiah(totalBayar)}`}
        </button>
      </aside>
    </div>
  )
}
