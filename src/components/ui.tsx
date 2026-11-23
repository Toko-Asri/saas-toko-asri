import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Inbox } from 'lucide-react'

/* ===== Design system: primitif UI bersama =====
   Nama ekspor lama (inputCls, btnCls, btnGhostCls, Field, Banner, PageHeader, Card, Table, LencanaTier) dipertahankan
   agar seluruh halaman otomatis memakai tampilan baru. */

export const inputCls =
  'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs ' +
  'placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:shadow-glow disabled:bg-slate-50 disabled:text-slate-400'

const tombolDasar =
  'inline-flex select-none items-center justify-center gap-2 font-semibold transition active:scale-[0.98] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const btnCls =
  tombolDasar + ' rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-brand-700 hover:shadow-md'
export const btnGhostCls =
  tombolDasar + ' rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'
export const btnSoftCls =
  tombolDasar + ' rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-100'
export const btnDangerCls =
  tombolDasar + ' rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>
}

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-fade-in">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
      </p>
    )
  }
  if (ok) {
    return (
      <p role="status" className="flex items-start gap-2.5 rounded-xl border border-mint-100 bg-mint-50 px-4 py-3 text-sm text-mint-700 animate-fade-in">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" /> <span>{ok}</span>
      </p>
    )
  }
  return null
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card md:p-5 ${className}`}>{children}</div>
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-500">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>tr]:transition-colors [&>tr:hover]:bg-brand-50/50">{children}</tbody>
      </table>
    </div>
  )
}

/* ----- Lencana status ----- */
export type NadaLencana = 'netral' | 'info' | 'sukses' | 'peringatan' | 'bahaya' | 'emas'

const NADA: Record<NadaLencana, { badge: string; titik: string }> = {
  netral: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', titik: 'bg-slate-400' },
  info: { badge: 'bg-brand-50 text-brand-800 ring-brand-200', titik: 'bg-brand-500' },
  sukses: { badge: 'bg-mint-50 text-mint-700 ring-mint-100', titik: 'bg-mint-600' },
  peringatan: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', titik: 'bg-amber-500' },
  bahaya: { badge: 'bg-red-50 text-red-700 ring-red-200', titik: 'bg-red-500' },
  emas: { badge: 'bg-amber-100 text-amber-900 ring-amber-300', titik: 'bg-amber-500' },
}

export function Badge({ nada = 'netral', children, titik = true }: { nada?: NadaLencana; children: ReactNode; titik?: boolean }) {
  const n = NADA[nada]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${n.badge}`}>
      {titik && <span aria-hidden className={`size-1.5 rounded-full ${n.titik}`} />}
      {children}
    </span>
  )
}

const TIER: Record<'reguler' | 'silver' | 'gold', { nada: NadaLencana; label: string }> = {
  reguler: { nada: 'netral', label: 'Reguler' },
  silver: { nada: 'info', label: 'Silver' },
  gold: { nada: 'emas', label: 'Gold' },
}

export function LencanaTier({ tier }: { tier: 'reguler' | 'silver' | 'gold' }) {
  return <Badge nada={TIER[tier].nada}>{TIER[tier].label}</Badge>
}

/* ----- Empty state ----- */
export function EmptyState({ judul, teks, ikon, children }: { judul: string; teks?: string; ikon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{ikon ?? <Inbox className="size-6" />}</span>
      <p className="font-semibold text-slate-800">{judul}</p>
      {teks && <p className="max-w-sm text-sm text-slate-500">{teks}</p>}
      {children}
    </div>
  )
}

// Baris kosong di dalam <Table>.
export function BarisKosong({ colSpan, children, ikon }: { colSpan: number; children: ReactNode; ikon?: ReactNode }) {
  return (
    <tr className="hover:!bg-transparent">
      <td colSpan={colSpan}><EmptyState judul={String(children)} ikon={ikon} /></td>
    </tr>
  )
}

/* ----- Skeleton ----- */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />
}

/* ----- Kartu KPI ----- */
export function KpiCard({
  judul, nilai, ikon, keterangan, nada = 'info', indeks = 0,
}: { judul: string; nilai: string; ikon: ReactNode; keterangan?: ReactNode; nada?: 'info' | 'sukses' | 'peringatan' | 'bahaya'; indeks?: number }) {
  const warna = {
    info: 'bg-brand-50 text-brand-600', sukses: 'bg-mint-50 text-mint-600',
    peringatan: 'bg-amber-50 text-amber-600', bahaya: 'bg-red-50 text-red-600',
  }[nada]
  return (
    <div className="reveal group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop md:p-5" style={{ '--i': indeks } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-500">{judul}</div>
          <div className="tabular mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{nilai}</div>
        </div>
        <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-105 ${warna}`}>{ikon}</span>
      </div>
      {keterangan && <div className="mt-2 text-xs text-slate-500">{keterangan}</div>}
    </div>
  )
}
