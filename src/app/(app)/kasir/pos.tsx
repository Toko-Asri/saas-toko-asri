'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/format'
import { kembalian, keItemCheckout, sinkronKeranjang, tambah, total, ubahQty, type BarisKeranjang } from '@/lib/pos-cart'
import { btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { poinDari } from '@/lib/loyalty'
import { saringPelanggan } from '@/lib/pelanggan'
import { bisaBayar as bolehBayar, buatPenjaga } from '@/lib/pos-guard'
import { LencanaTier } from '@/components/ui'
import { bayar, tambahPelangganCepat, type PelangganPos } from './actions'

export type ProdukPos = { id: string; sku: string; nama: string; satuan: string; harga: number; stokLayak: number }
type Metode = 'tunai' | 'qris' | 'transfer'

export function Pos({ produk, pelanggan }: { produk: ProdukPos[]; pelanggan: PelangganPos[] }) {
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [mentah, setKeranjang] = useState<BarisKeranjang[]>([])
  const [metode, setMetode] = useState<Metode>('tunai')
  const [bayarStr, setBayarStr] = useState('')
  const [memproses, setMemproses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [cariPelanggan, setCariPelanggan] = useState('')
  const [pelangganId, setPelangganId] = useState<string | null>(null)
  const [baru, setBaru] = useState<PelangganPos[]>([])        // pelanggan yang baru ditambahkan dari kasir
  const [formBaru, setFormBaru] = useState(false)
  const [menyimpanBaru, setMenyimpanBaru] = useState(false)
  const [namaBaru, setNamaBaru] = useState('')
  const [teleponBaru, setTeleponBaru] = useState('')
  const [galatBaru, setGalatBaru] = useState<string | null>(null)
  // Kunci idempoten: dibuat saat pertama kali bayar dan DIPERTAHANKAN sampai transaksi berhasil atau keranjang
  // dikosongkan. Kirim ulang (klik ganda / respons hilang) memakai kunci yang sama sehingga tidak menjadi
  // transaksi ganda; server menolak kunci yang sama bila isinya berbeda.
  const kunci = useRef<string | null>(null)

  // Keranjang turunan: selalu selaras dengan data server terbaru (setelah router.refresh() harga/stok bisa berubah).
  const keranjang = useMemo(
    () => sinkronKeranjang(mentah, produk.map((p) => ({ productId: p.id, nama: p.nama, harga: p.harga, stokLayak: p.stokLayak }))),
    [mentah, produk],
  )
  useEffect(() => { if (keranjang.length === 0) kunci.current = null }, [keranjang.length])

  const semuaPelanggan = useMemo(() => [...baru.filter((b) => !pelanggan.some((p) => p.id === b.id)), ...pelanggan], [baru, pelanggan])
  // pelanggan terpilih diselaraskan dengan data server terbaru; hilang bila sudah nonaktif
  const terpilih = semuaPelanggan.find((p) => p.id === pelangganId) ?? null
  const hasilCari = saringPelanggan(semuaPelanggan, cariPelanggan)

  const totalBayar = total(keranjang)
  const jumlahBayar = metode === 'tunai' ? Number(bayarStr || 0) : totalBayar
  const kemb = kembalian(totalBayar, jumlahBayar)
  // pelanggan yang dipilih sudah tidak tersedia (mis. dinonaktifkan): blokir bayar sampai dipilih ulang atau memilih tamu
  const pelangganHilang = pelangganId !== null && terpilih === null
  const bisaBayar = bolehBayar({ jumlahItem: keranjang.length, memproses, kembalian: kemb, pelangganHilang })

  const q = cari.trim().toLowerCase()
  const tampil = produk.filter((p) => !q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  const qtyDiKeranjang = (id: string) => keranjang.find((b) => b.productId === id)?.qty ?? 0

  function kunciUntuk(): string {
    if (!kunci.current) kunci.current = crypto.randomUUID()
    return kunci.current
  }

  function kosongkan() {
    setKeranjang([])
    setBayarStr('')
    setGalat(null)
    setPelangganId(null)
    kunci.current = null
  }

  async function simpanPelangganBaru() {
    setGalatBaru(null)
    setMenyimpanBaru(true)
    try {
      const h = await tambahPelangganCepat({ nama: namaBaru, telepon: teleponBaru })
      if (h.error || !h.pelanggan) { setGalatBaru(h.error ?? 'Gagal menambah pelanggan'); return }
      setBaru((b) => [h.pelanggan!, ...b])
      setPelangganId(h.pelanggan.id)
      setFormBaru(false); setNamaBaru(''); setTeleponBaru(''); setCariPelanggan('')
    } catch {
      setGalatBaru('Koneksi bermasalah. Periksa daftar pelanggan sebelum mencoba lagi agar tidak terduplikasi.')
    } finally {
      setMenyimpanBaru(false)
    }
  }

  // Penjaga klik ganda (tidak bergantung pada render ulang); hanya dipanggil dari event handler.
  const [penjagaBayar] = useState(buatPenjaga)
  const [penjagaSimpanBaru] = useState(buatPenjaga)
  const jalankanBayar = () => penjagaBayar.jalankan(prosesBayar)
  const jalankanSimpanBaru = () => penjagaSimpanBaru.jalankan(simpanPelangganBaru)

  async function prosesBayar() {
    if (!bisaBayar) return
    setMemproses(true)
    setGalat(null)
    try {
      const hasil = await bayar({ items: keItemCheckout(keranjang), metode, bayar: jumlahBayar, key: kunciUntuk(), customerId: terpilih?.id ?? null })
      if (hasil.error) {
        setGalat(hasil.error.includes('Kunci transaksi')
          ? 'Transaksi dengan keranjang ini mungkin sudah tercatat. Periksa Riwayat Penjualan; jika belum ada, tekan "Kosongkan keranjang" lalu input ulang.'
          : hasil.error)
        router.refresh() // harga/stok mungkin berubah: muat ulang data produk, keranjang diselaraskan otomatis
        return
      }
      kunci.current = null
      router.push(`/kasir/riwayat/${hasil.saleId}`)
    } catch {
      setGalat('Koneksi bermasalah. Mencoba lagi dengan isi yang sama aman dari transaksi ganda; jika ragu, periksa Riwayat Penjualan dulu.')
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keranjang</h2>
          {keranjang.length > 0 && <button type="button" onClick={kosongkan} className={btnGhostCls}>Kosongkan keranjang</button>}
        </div>
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

        <div className="space-y-2 rounded border p-3 text-sm">
          <div className="font-medium">Pelanggan</div>
          {terpilih ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{terpilih.nama} <LencanaTier tier={terpilih.tier} /></div>
                <div className="text-slate-500">{terpilih.poin} poin{totalBayar > 0 ? ` · transaksi ini +${poinDari(totalBayar)} poin` : ''}</div>
              </div>
              <button type="button" className={btnGhostCls} onClick={() => setPelangganId(null)}>Ganti</button>
            </div>
          ) : (
            <>
              {pelangganHilang && (
                <div role="alert" className="space-y-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                  <p>Pelanggan yang dipilih tidak lagi tersedia (mungkin dinonaktifkan). Tombol Bayar dinonaktifkan sampai Anda memilih pelanggan lain atau memilih tamu.</p>
                  <button type="button" className={btnGhostCls} onClick={() => setPelangganId(null)}>Lanjutkan sebagai tamu</button>
                </div>
              )}
              <input value={cariPelanggan} onChange={(e) => setCariPelanggan(e.target.value)} placeholder="Cari nama atau telepon… (kosong = tamu)" className={inputCls} aria-label="Cari pelanggan" />
              {hasilCari.length > 0 && (
                <ul className="divide-y rounded border bg-white">
                  {hasilCari.map((p) => (
                    <li key={p.id}><button type="button" onClick={() => { setPelangganId(p.id); setCariPelanggan('') }} className="flex w-full items-center justify-between px-2 py-1 text-left hover:bg-slate-50">
                      <span>{p.nama}<span className="ml-2 text-xs text-slate-500">{p.telepon ?? ''}</span></span><LencanaTier tier={p.tier} />
                    </button></li>
                  ))}
                </ul>
              )}
              {cariPelanggan.trim() !== '' && hasilCari.length === 0 && <p className="text-xs text-slate-500">Tidak ditemukan.</p>}
              {!formBaru ? (
                <button type="button" className={btnGhostCls} onClick={() => { setFormBaru(true); setNamaBaru(cariPelanggan.trim()) }}>+ Pelanggan baru</button>
              ) : (
                <div className="space-y-2">
                  <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Nama *" className={inputCls} aria-label="Nama pelanggan baru" />
                  <input value={teleponBaru} onChange={(e) => setTeleponBaru(e.target.value)} placeholder="Telepon / WhatsApp" inputMode="tel" className={inputCls} aria-label="Telepon pelanggan baru" />
                  {galatBaru && <p role="alert" className="text-xs text-red-700">{galatBaru}</p>}
                  <div className="flex gap-2"><button type="button" className={btnCls + ' disabled:opacity-50'} onClick={jalankanSimpanBaru} disabled={menyimpanBaru}>{menyimpanBaru ? 'Menyimpan…' : 'Simpan'}</button><button type="button" className={btnGhostCls} onClick={() => setFormBaru(false)}>Batal</button></div>
                </div>
              )}
              <p className="text-xs text-slate-500">Tanpa pelanggan, transaksi dicatat sebagai tamu (tanpa poin).</p>
            </>
          )}
        </div>

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
        <button type="button" onClick={jalankanBayar} disabled={!bisaBayar} className={btnCls + ' w-full disabled:opacity-50'}>
          {memproses ? 'Memproses…' : `Bayar ${formatRupiah(totalBayar)}`}
        </button>
      </aside>
    </div>
  )
}
