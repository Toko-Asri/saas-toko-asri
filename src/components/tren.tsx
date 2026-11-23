import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { labelPerubahan, type Perubahan } from '@/lib/dashboard'

// Chip tren: hijau naik, merah turun, abu-abu sama/baru. `naikBaik=false` membalik makna warna (mis. kerugian).
export function Tren({ p, naikBaik = true }: { p: Perubahan; naikBaik?: boolean }) {
  const baik = p.arah === 'tetap' || p.arah === 'baru' ? null : (p.arah === 'naik') === naikBaik
  const warna = baik === null ? 'bg-slate-100 text-slate-600' : baik ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'
  const Ikon = p.arah === 'naik' ? TrendingUp : p.arah === 'turun' ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${warna}`}>
      <Ikon aria-hidden className="size-3.5" />
      {labelPerubahan(p).replace(/^[▲▼●] ?/, '')}
    </span>
  )
}
