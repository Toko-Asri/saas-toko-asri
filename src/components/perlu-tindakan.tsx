import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight, CircleAlert, Clock, Info, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Tindakan } from '@/lib/dashboard'
import { Badge } from '@/components/ui'

const TINGKAT: Record<Tindakan['tingkat'], { ikon: ReactNode; warna: string; aksen: string; label: string }> = {
  mendesak: { ikon: <CircleAlert className="size-5" />, warna: 'bg-red-50 text-red-600', aksen: 'border-l-red-500', label: 'Mendesak' },
  perlu: { ikon: <Clock className="size-5" />, warna: 'bg-amber-50 text-amber-600', aksen: 'border-l-amber-500', label: 'Perlu' },
  info: { ikon: <Info className="size-5" />, warna: 'bg-brand-50 text-brand-600', aksen: 'border-l-brand-500', label: 'Info' },
}

export function PerluTindakan({ tindakan }: { tindakan: Tindakan[] }) {
  if (tindakan.length === 0) {
    return (
      <section aria-label="Perlu tindakan" className="reveal flex items-center gap-4 rounded-2xl border border-mint-100 bg-gradient-to-r from-mint-50 to-white p-5 shadow-card">
        <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-white text-mint-600 shadow-sm"><ShieldCheck className="size-6" /></span>
        <div><h2 className="font-bold text-slate-900">Semua beres</h2><p className="text-sm text-slate-600">Tidak ada yang perlu ditindaklanjuti saat ini.</p></div>
      </section>
    )
  }
  const teratas = tindakan[0].tingkat
  return (
    <section aria-label="Perlu tindakan" className={`reveal rounded-2xl border border-slate-200/80 border-l-4 bg-white p-4 shadow-card md:p-5 ${TINGKAT[teratas].aksen}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldAlert aria-hidden className={teratas === 'mendesak' ? 'size-5 text-red-600' : 'size-5 text-amber-600'} />Perlu tindakan</h2>
        <Badge nada={teratas === 'mendesak' ? 'bahaya' : 'peringatan'}>{tindakan.length} hal</Badge>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {tindakan.map((t) => (
          <li key={t.kode}>
            <Link href={t.tautan} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-card">
              <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${TINGKAT[t.tingkat].warna}`}>{TINGKAT[t.tingkat].ikon}</span>
              <span className="flex-1 font-medium text-slate-800">{t.teks}</span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
