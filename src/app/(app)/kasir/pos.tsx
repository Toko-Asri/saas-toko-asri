'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/format'
import { kembalian, keItemCheckout, sinkronKeranjang, tambah, total, ubahQty, type BarisKeranjang } from '@/lib/pos-cart'
import { Banknote, Landmark, LoaderCircle, Minus, Plus, QrCode, Search, ShoppingCart, Trash2, UserPlus, X } from 'lucide-react'
import { btnGhostCls, inputCls, btnSoftCls, btnCls } from '@/components/ui'
import { inisial } from '@/lib/nav'
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

  // Penjaga klik ganda (tidak bergantung pada render ulang); hanya dipanggil dari event handler.
  const [penjagaBayar] = useState(buatPenjaga)
  const [penjagaSimpanBaru] = useState(buatPenjaga)

  function kosongkan() {
    setKeranjang([])
    setBayarStr('')
    setGalat(null)
    setPelangganId(null)
    kunci.current = null
    setMemproses(false)
    penjagaBayar.lepas()   // buka kunci setelah sukses bila kasir memilih tetap di halaman ini
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

  const jalankanBayar = () => penjagaBayar.jalankan(prosesBayar, { kunciSetelahSukses: (ok) => ok === true })
  const jalankanSimpanBaru = () => penjagaSimpanBaru.jalankan(simpanPelangganBaru)

  // Mengembalikan true bila transaksi berhasil. Pada sukses, tombol TETAP terkunci (memproses tetap true dan penjaga
  // tidak dilepas) sampai halaman struk menggantikan POS, agar klik berikutnya tidak membuat transaksi kedua.
  async function prosesBayar(): Promise<boolean> {
    if (!bisaBayar) return false
    setMemproses(true)
    setGalat(null)
    try {
      const hasil = await bayar({ items: keItemCheckout(keranjang), metode, bayar: jumlahBayar, key: kunciUntuk(), customerId: terpilih?.id ?? null })
      if (hasil.error) {
        setGalat(hasil.error.includes('Kunci transaksi')
          ? 'Transaksi dengan keranjang ini mungkin sudah tercatat. Periksa Riwayat Penjualan; jika belum ada, tekan "Kosongkan keranjang" lalu input ulang.'
          : hasil.error)
        router.refresh() // harga/stok mungkin berubah: muat ulang data produk, keranjang diselaraskan otomatis
        setMemproses(false)
        return false
      }
      kunci.current = null
      router.push(`/kasir/riwayat/${hasil.saleId}?baru=1`)
      return true
    } catch {
      setGalat('Koneksi bermasalah. Mencoba lagi dengan isi yang sama aman dari transaksi ganda; jika ragu, periksa Riwayat Penjualan dulu.')
      setMemproses(false)
      return false
    }
  }

  const jumlahItem = keranjang.reduce((a, b) => a + b.qty, 0)
  const METODE: { kode: Metode; label: string; ikon: React.ReactNode }[] = [
    { kode: 'tunai', label: 'Tunai', ikon: <Banknote aria-hidden className="size-5" /> },
    { kode: 'qris', label: 'QRIS', ikon: <QrCode aria-hidden className="size-5" /> },
    { kode: 'transfer', label: 'Transfer', ikon: <Landmark aria-hidden className="size-5" /> },
  ]

  return (
    <div className="grid items-start gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_26rem] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_28rem]">
      {/* ===== Kolom kiri: produk ===== */}
      <section aria-label="Produk" className="space-y-4">
        <div className="sticky top-16 z-20 -mx-1 bg-ice/90 px-1 py-2 backdrop-blur">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama atau SKU…" className="block h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-base shadow-card transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:shadow-glow" aria-label="Cari produk" />
            {cari && (
              <button type="button" onClick={() => setCari('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X aria-hidden className="size-4" /></button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {tampil.map((p) => {
            const habis = p.stokLayak <= 0
            const qty = qtyDiKeranjang(p.id)
            const penuh = qty >= p.stokLayak
            return (
              <button key={p.id} type="button" disabled={habis || penuh}
                onClick={() => setKeranjang((k) => tambah(k, { productId: p.id, nama: p.nama, harga: p.harga, stokLayak: p.stokLayak }))}
                className={`group relative flex min-h-[7.5rem] flex-col rounded-2xl border bg-white p-3.5 text-left shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-pop active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-card ${
                  qty > 0 ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200/80 hover:border-brand-300'
                } ${habis ? 'opacity-55' : ''}`}>
                <span aria-hidden className="mb-2 grid size-9 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 transition group-hover:bg-brand-100">{inisial(p.nama)}</span>
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{p.nama}</span>
                <span className="tabular mt-1 font-bold text-brand-700">{formatRupiah(p.harga)}</span>
                <span className={`mt-auto pt-2 text-xs ${habis ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{habis ? 'Stok habis' : penuh ? 'Maksimum di keranjang' : `Stok ${p.stokLayak} ${p.satuan}`}</span>
                {qty > 0 && <span className="absolute right-2.5 top-2.5 grid min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white shadow-sm animate-scale-in">{qty}</span>}
              </button>
            )
          })}
          {tampil.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">Produk tidak ditemukan.</p>}
        </div>
      </section>

      {/* ===== Kolom kanan: keranjang ===== */}
      <aside id="keranjang" aria-label="Keranjang" className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-pop lg:sticky lg:top-20 md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ShoppingCart aria-hidden className="size-5 text-brand-600" />Keranjang{jumlahItem > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{jumlahItem} item</span>}</h2>
          {keranjang.length > 0 && <button type="button" onClick={kosongkan} className={btnGhostCls}>Kosongkan keranjang</button>}
        </div>

        {/* Pelanggan */}
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pelanggan</div>
          {terpilih ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">{inisial(terpilih.nama)}</span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{terpilih.nama} <LencanaTier tier={terpilih.tier} /></div>
                  <div className="text-xs text-slate-500">{terpilih.poin} poin{totalBayar > 0 ? ` · transaksi ini +${poinDari(totalBayar)} poin` : ''}</div>
                </div>
              </div>
              <button type="button" className={btnGhostCls} onClick={() => setPelangganId(null)}>Ganti</button>
            </div>
          ) : (
            <>
              {pelangganHilang && (
                <div role="alert" className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <p>Pelanggan yang dipilih tidak lagi tersedia (mungkin dinonaktifkan). Tombol Bayar dinonaktifkan sampai Anda memilih pelanggan lain atau memilih tamu.</p>
                  <button type="button" className={btnGhostCls} onClick={() => setPelangganId(null)}>Lanjutkan sebagai tamu</button>
                </div>
              )}
              <input value={cariPelanggan} onChange={(e) => setCariPelanggan(e.target.value)} placeholder="Cari nama atau telepon… (kosong = tamu)" className={inputCls + ' mt-0'} aria-label="Cari pelanggan" />
              {hasilCari.length > 0 && (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {hasilCari.map((p) => (
                    <li key={p.id}><button type="button" onClick={() => { setPelangganId(p.id); setCariPelanggan('') }} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-brand-50">
                      <span className="min-w-0 truncate">{p.nama}<span className="ml-2 text-xs text-slate-500">{p.telepon ?? ''}</span></span><LencanaTier tier={p.tier} />
                    </button></li>
                  ))}
                </ul>
              )}
              {cariPelanggan.trim() !== '' && hasilCari.length === 0 && <p className="text-xs text-slate-500">Tidak ditemukan.</p>}
              {!formBaru ? (
                <button type="button" className={btnGhostCls} onClick={() => { setFormBaru(true); setNamaBaru(cariPelanggan.trim()) }}><UserPlus aria-hidden className="size-3.5" />Pelanggan baru</button>
              ) : (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Nama *" className={inputCls + ' mt-0'} aria-label="Nama pelanggan baru" />
                  <input value={teleponBaru} onChange={(e) => setTeleponBaru(e.target.value)} placeholder="Telepon / WhatsApp" inputMode="tel" className={inputCls + ' mt-0'} aria-label="Telepon pelanggan baru" />
                  {galatBaru && <p role="alert" className="text-xs text-red-700">{galatBaru}</p>}
                  <div className="flex gap-2"><button type="button" className={btnCls + ' !px-4 !py-2'} onClick={jalankanSimpanBaru} disabled={menyimpanBaru}>{menyimpanBaru ? 'Menyimpan…' : 'Simpan'}</button><button type="button" className={btnGhostCls} onClick={() => setFormBaru(false)}>Batal</button></div>
                </div>
              )}
              <p className="text-xs text-slate-500">Tanpa pelanggan, transaksi dicatat sebagai tamu (tanpa poin).</p>
            </>
          )}
        </div>

        {/* Isi keranjang */}
        {keranjang.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><ShoppingCart className="size-6" /></span>
            <p className="font-semibold text-slate-700">Keranjang kosong</p>
            <p className="text-sm text-slate-500">Ketuk produk di sebelah kiri untuk menambahkannya.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {keranjang.map((b) => (
              <li key={b.productId} className="flex items-center gap-3 py-3 animate-fade-in">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{b.nama}</div>
                  <div className="tabular text-xs text-slate-500">{formatRupiah(b.harga)} × {b.qty} = <b className="text-slate-700">{formatRupiah(b.harga * b.qty)}</b></div>
                </div>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
                  <button type="button" aria-label={`Kurangi ${b.nama}`} onClick={() => setKeranjang((k) => ubahQty(k, b.productId, b.qty - 1))} className="grid size-10 place-items-center text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"><Minus aria-hidden className="size-4" /></button>
                  <input type="number" min={0} max={b.stokLayak} value={b.qty} aria-label={`Jumlah ${b.nama}`} onChange={(e) => setKeranjang((k) => ubahQty(k, b.productId, Number(e.target.value)))} className="tabular h-10 w-11 border-x border-slate-200 bg-white text-center text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <button type="button" aria-label={`Tambah ${b.nama}`} disabled={b.qty >= b.stokLayak} onClick={() => setKeranjang((k) => ubahQty(k, b.productId, b.qty + 1))} className="grid size-10 place-items-center text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 disabled:opacity-35 disabled:hover:bg-transparent"><Plus aria-hidden className="size-4" /></button>
                </div>
                <button type="button" onClick={() => setKeranjang((k) => ubahQty(k, b.productId, 0))} className="grid size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Hapus ${b.nama}`}><Trash2 aria-hidden className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-baseline justify-between border-t border-slate-200 pt-4">
          <span className="text-sm font-semibold text-slate-500">Total</span>
          <span className="tabular text-3xl font-extrabold tracking-tight text-slate-900">{formatRupiah(totalBayar)}</span>
        </div>

        {/* Metode bayar */}
        <div role="radiogroup" aria-label="Metode pembayaran" className="grid grid-cols-3 gap-2">
          {METODE.map((m) => (
            <button key={m.kode} type="button" role="radio" aria-checked={metode === m.kode} onClick={() => setMetode(m.kode)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition active:scale-[0.97] ${metode === m.kode ? 'border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-200' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50/50'}`}>
              {m.ikon}{m.label}
            </button>
          ))}
        </div>

        {metode === 'tunai' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Uang diterima (Rp)
              <input type="number" inputMode="numeric" min={0} step={500} value={bayarStr} onChange={(e) => setBayarStr(e.target.value)} className="tabular mt-1.5 block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-semibold shadow-xs focus:border-brand-500 focus:outline-none focus:shadow-glow" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSoftCls + ' !px-3.5 !py-2 !text-xs'} onClick={() => setBayarStr(String(totalBayar))}>Uang pas</button>
              {[20000, 50000, 100000].map((n) => <button key={n} type="button" className={btnSoftCls + ' !px-3.5 !py-2 !text-xs'} onClick={() => setBayarStr(String(n))}>{formatRupiah(n)}</button>)}
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${kemb === null ? 'bg-red-50 text-red-700' : 'bg-mint-50 text-mint-700'}`}>
              <span className="font-medium">Kembalian</span>
              <span className="tabular text-lg font-bold">{kemb === null ? 'Uang kurang' : formatRupiah(kemb)}</span>
            </div>
          </div>
        ) : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Pembayaran {metode} dicatat sebesar total belanja.</p>}

        {galat && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{galat}</p>}
        <button type="button" onClick={jalankanBayar} disabled={!bisaBayar} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-500 to-brand-700 text-base font-bold text-white shadow-lg shadow-brand-700/25 transition hover:from-brand-600 hover:to-brand-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none">
          {memproses ? <><LoaderCircle aria-hidden className="size-5 animate-spin" />Memproses…</> : `Bayar ${formatRupiah(totalBayar)}`}
        </button>
      </aside>

      {/* Bar ringkas mobile: total dan pintasan ke keranjang */}
      {keranjang.length > 0 && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-pop backdrop-blur lg:hidden">
          <a href="#keranjang" className="flex h-12 items-center justify-between rounded-xl bg-brand-600 px-4 text-white shadow-md active:scale-[0.99]">
            <span className="text-sm font-semibold">{jumlahItem} item</span>
            <span className="tabular text-base font-bold">{formatRupiah(totalBayar)} · Lihat keranjang</span>
          </a>
        </div>
      )}
    </div>
  )
}
