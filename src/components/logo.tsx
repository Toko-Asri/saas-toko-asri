import { Snowflake } from 'lucide-react'

// Logo Toko Asri: kristal es pada kotak gradien brand + wordmark. Ukuran lewat prop agar dipakai di sidebar, login, dan intro.
export function LogoMark({ ukuran = 40, className = '' }: { ukuran?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/30 ring-1 ring-white/25 ${className}`}
      style={{ width: ukuran, height: ukuran }}
    >
      <Snowflake style={{ width: ukuran * 0.58, height: ukuran * 0.58 }} strokeWidth={2.2} />
    </span>
  )
}

export function Logo({ ukuran = 40, teks = true, terang = false }: { ukuran?: number; teks?: boolean; terang?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark ukuran={ukuran} />
      {teks && (
        <span className="leading-tight">
          <span className={`block text-lg font-extrabold tracking-tight ${terang ? 'text-white' : 'text-slate-900'}`}>Toko Asri</span>
          <span className={`block text-[11px] font-medium uppercase tracking-[0.16em] ${terang ? 'text-brand-200' : 'text-slate-500'}`}>Frozen food</span>
        </span>
      )}
    </span>
  )
}
