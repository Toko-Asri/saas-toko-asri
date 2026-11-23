import { UserRoundX } from 'lucide-react'
import { Logo } from '@/components/logo'
import { logout } from '../login/actions'

export default function AkunBelumAktif() {
  return (
    <main className="grid min-h-screen place-items-center bg-ice p-6">
      <div className="w-full max-w-md animate-fade-up space-y-6 text-center">
        <div className="flex justify-center"><Logo ukuran={44} /></div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-card">
          <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600"><UserRoundX className="size-7" /></span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Akun belum diaktifkan</h1>
          <p className="mt-2 text-sm text-slate-600">Akun Anda sudah terdaftar tetapi belum diberi peran (pemilik, kasir, atau staf gudang). Hubungi pemilik toko.</p>
          <form action={logout} className="mt-6">
            <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Keluar</button>
          </form>
        </div>
      </div>
    </main>
  )
}
