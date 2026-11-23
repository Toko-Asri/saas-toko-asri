'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { Logo, LogoMark } from '@/components/logo'
import { IkonMenu } from '@/components/shell/ikon'
import { inisial, itemAktif, type KelompokNav } from '@/lib/nav'

const KUNCI_CIUT = 'asri.sidebar.ciut'

// Status ciut disimpan di localStorage lewat useSyncExternalStore: aman hydration (server selalu "terbuka") dan bebas setState di effect.
function bacaCiut(): boolean {
  try { return window.localStorage.getItem(KUNCI_CIUT) === '1' } catch { return false }
}
function langganCiut(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener('asri:ciut', cb)
  return () => { window.removeEventListener('storage', cb); window.removeEventListener('asri:ciut', cb) }
}
function setCiut(nilai: boolean) {
  try { window.localStorage.setItem(KUNCI_CIUT, nilai ? '1' : '0') } catch { /* penyimpanan diblokir: tetap berfungsi tanpa persisten */ }
  window.dispatchEvent(new Event('asri:ciut'))
}

type Props = {
  nama: string
  peran: string
  kelompok: KelompokNav[]
  keluar: () => Promise<void>
  children: React.ReactNode
}

function Navigasi({ kelompok, aktif, ciut, onPilih }: { kelompok: KelompokNav[]; aktif: string | null; ciut: boolean; onPilih?: () => void }) {
  return (
    <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {kelompok.map((g, gi) => (
        <div key={g.judul}>
          {ciut ? (
            gi > 0 && <div aria-hidden className="mx-3 mb-3 border-t border-white/10" />
          ) : (
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300/70">{g.judul}</div>
          )}
          <ul className="space-y-0.5">
            {g.item.map((i) => {
              const sedang = aktif === i.href
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onPilih}
                    title={ciut ? i.label : undefined}
                    aria-label={ciut ? i.label : undefined}
                    aria-current={sedang ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${ciut ? 'justify-center' : ''} ${
                      sedang ? 'bg-white/12 text-white' : 'text-slate-300 hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    {/* indikator halaman aktif */}
                    <span aria-hidden className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400 transition-all duration-200 ${sedang ? 'opacity-100' : 'h-0 opacity-0'}`} />
                    <span className={`transition-transform duration-150 group-hover:scale-110 ${sedang ? 'text-brand-300' : ''}`}><IkonMenu nama={i.ikon} /></span>
                    {!ciut && <span className="truncate">{i.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell({ nama, peran, kelompok, keluar, children }: Props) {
  const pathname = usePathname()
  const ciut = useSyncExternalStore(langganCiut, bacaCiut, () => false)
  const [drawer, setDrawer] = useState(false)
  const semuaHref = kelompok.flatMap((g) => g.item.map((i) => i.href))
  const aktif = itemAktif(pathname, semuaHref)
  const labelAktif = kelompok.flatMap((g) => g.item).find((i) => i.href === aktif)?.label ?? 'Toko Asri'

  // Drawer mobile: tutup dengan Esc dan kunci scroll latar selama terbuka.
  useEffect(() => {
    if (!drawer) return
    const tutup = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    document.addEventListener('keydown', tutup)
    const awal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tutup); document.body.style.overflow = awal }
  }, [drawer])

  return (
    <div className="min-h-screen">
      <a href="#konten" className="no-print sr-only z-[60] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Lewati ke konten</a>

      {/* Sidebar desktop */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 hidden flex-col bg-gradient-to-b from-ink-900 via-ink-900 to-ink-950 text-slate-200 shadow-pop transition-[width] duration-300 ease-out md:flex ${ciut ? 'w-[4.75rem]' : 'w-64'}`}
      >
        <div className={`flex h-16 items-center border-b border-white/10 px-4 ${ciut ? 'justify-center' : ''}`}>
          {ciut ? <LogoMark ukuran={36} /> : <Logo ukuran={36} terang />}
        </div>
        <Navigasi kelompok={kelompok} aktif={aktif} ciut={ciut} />
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setCiut(!ciut)}
            aria-label={ciut ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!ciut}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/6 hover:text-white ${ciut ? 'justify-center' : ''}`}
          >
            {ciut ? <PanelLeftOpen aria-hidden className="size-5" /> : <><PanelLeftClose aria-hidden className="size-5" /><span>Ciutkan</span></>}
          </button>
        </div>
      </aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="no-print fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <button type="button" aria-label="Tutup menu" onClick={() => setDrawer(false)} className="absolute inset-0 animate-fade-in bg-ink-950/55 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-drawer-in flex-col bg-gradient-to-b from-ink-900 to-ink-950 text-slate-200 shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo ukuran={36} terang />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Tutup menu" className="grid size-10 place-items-center rounded-xl text-slate-300 hover:bg-white/10"><X aria-hidden className="size-5" /></button>
            </div>
            <Navigasi kelompok={kelompok} aktif={aktif} ciut={false} onPilih={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-out ${ciut ? 'md:pl-[4.75rem]' : 'md:pl-64'}`}>
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md md:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Buka menu" className="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"><Menu aria-hidden className="size-5" /></button>
          <button
            type="button"
            onClick={() => setCiut(!ciut)}
            aria-label={ciut ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="hidden size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:grid"
          >
            {ciut ? <PanelLeftOpen aria-hidden className="size-5" /> : <PanelLeftClose aria-hidden className="size-5" />}
          </button>
          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 md:text-base">{labelAktif}</div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="max-w-[10rem] truncate text-sm font-semibold text-slate-900">{nama}</div>
              <div className="text-xs font-medium text-brand-700">{peran}</div>
            </div>
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm ring-2 ring-white">{inisial(nama)}</span>
            <form action={keluar}>
              <button className="grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label="Keluar" title="Keluar">
                <LogOut aria-hidden className="size-5" />
              </button>
            </form>
          </div>
        </header>
        <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 p-4 outline-none md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  )
}
