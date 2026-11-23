'use client'
import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/logo'
import { perluIntro } from '@/lib/nav'

const KUNCI = 'asri.intro'
const DURASI_TAMPIL = 2400 // ms sebelum mulai memudar
const DURASI_PUDAR = 450

// Opening animation login: logo fade-in + scale, tagline, lalu transisi halus ke formulir.
// Sekali per sesi (sessionStorage), dapat dilewati (tombol atau Esc), dan dilewati sepenuhnya bila prefers-reduced-motion.
// Keputusan "lewati" sudah dibuat sebelum paint oleh skrip kecil di page.tsx (data-intro="skip"); komponen ini hanya melepas overlay dari DOM.
export function IntroLogin() {
  const [fase, setFase] = useState<'main' | 'pudar' | 'selesai'>('main')

  useEffect(() => {
    let sudahTampil = false
    let kurangiGerak = false
    try {
      sudahTampil = window.sessionStorage.getItem(KUNCI) === '1'
      kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* penyimpanan diblokir: anggap belum tampil */ }

    if (!perluIntro({ sudahTampil, kurangiGerak })) {
      const t = window.setTimeout(() => setFase('selesai'), 0)
      return () => window.clearTimeout(t)
    }
    try { window.sessionStorage.setItem(KUNCI, '1') } catch { /* abaikan */ }
    const t1 = window.setTimeout(() => setFase('pudar'), DURASI_TAMPIL)
    const t2 = window.setTimeout(() => setFase('selesai'), DURASI_TAMPIL + DURASI_PUDAR)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFase('pudar') }
    window.addEventListener('keydown', esc)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener('keydown', esc) }
  }, [])

  // Setelah memudar, lepas dari DOM dengan jeda singkat agar transisi opacity selesai.
  useEffect(() => {
    if (fase !== 'pudar') return
    const t = window.setTimeout(() => setFase('selesai'), DURASI_PUDAR)
    return () => window.clearTimeout(t)
  }, [fase])

  if (fase === 'selesai') return null
  return (
    <div
      className={`intro-overlay fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 transition-opacity ease-out ${fase === 'pudar' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${DURASI_PUDAR}ms` }}
      role="status"
      aria-label="Memuat Toko Asri"
    >
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="animate-intro-logo"><LogoMark ukuran={104} /></div>
        <h1 className="animate-intro-logo mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl">Toko Asri</h1>
        <p className="animate-intro-tag mt-3 text-sm font-medium uppercase text-brand-200 md:text-base">Fresh Quality, Frozen Convenience</p>
        <div aria-hidden className="mt-10 h-0.5 w-48 overflow-hidden rounded-full bg-white/15">
          <div className="animate-intro-bar h-full origin-left rounded-full bg-gradient-to-r from-brand-300 to-white" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFase('pudar')}
        className="absolute bottom-6 right-6 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur transition hover:bg-white/20"
      >
        Lewati
      </button>
    </div>
  )
}
