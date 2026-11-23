import { Boxes, Receipt, Users } from 'lucide-react'
import { Logo } from '@/components/logo'
import { IntroLogin } from './intro'
import { FormMasuk } from './form-masuk'

// Dijalankan sebelum paint: bila intro sudah tampil di sesi ini atau gerak dikurangi, sembunyikan overlay agar tidak berkedip.
// (Aturan yang sama dengan perluIntro() di src/lib/nav.ts, yang diuji unit.)
const SKRIP_INTRO =
  "try{if(sessionStorage.getItem('asri.intro')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.intro='skip'}catch(e){}"

const FITUR = [
  { ikon: Boxes, judul: 'Stok per batch', teks: 'Kedaluwarsa dan lokasi simpan tercatat per batch, FEFO otomatis.' },
  { ikon: Receipt, judul: 'Kasir yang cepat', teks: 'Transaksi, struk, dan laporan laba dalam satu alur.' },
  { ikon: Users, judul: 'Pelanggan terhubung', teks: 'Poin, tier, dan segmentasi dari setiap penjualan.' },
]

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKRIP_INTRO }} />
      <IntroLogin />
      <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* Panel brand (desktop) */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-400/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-brand-600/20 blur-3xl" />
          <Logo ukuran={44} terang />
          <div className="relative max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-200">Fresh Quality, Frozen Convenience</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">Satu sistem untuk seluruh toko frozen food Anda.</h2>
            <p className="mt-4 text-base text-slate-300">ERP, SCM, dan CRM yang terhubung: dari barang masuk, penjualan, hingga hubungan dengan pelanggan.</p>
            <ul className="mt-10 space-y-5">
              {FITUR.map((f) => (
                <li key={f.judul} className="flex items-start gap-4">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-200 ring-1 ring-white/15"><f.ikon className="size-5" /></span>
                  <span><span className="block font-semibold">{f.judul}</span><span className="block text-sm text-slate-300">{f.teks}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-slate-400">Aplikasi internal Toko Asri</p>
        </section>

        {/* Formulir */}
        <section className="flex items-center justify-center bg-ice px-6 py-12">
          <div className="w-full max-w-md animate-fade-up">
            <div className="mb-8 lg:hidden"><Logo ukuran={44} /></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Selamat datang kembali</h1>
            <p className="mt-2 text-sm text-slate-500">Masuk untuk mengelola toko Anda.</p>
            <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
              <FormMasuk galat={error} />
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">Lupa kata sandi? Hubungi pemilik toko.</p>
          </div>
        </section>
      </main>
    </>
  )
}
