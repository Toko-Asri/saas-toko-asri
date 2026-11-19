import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { menuFor } from '@/lib/roles'
import { logout } from '../login/actions'

const NAMA_PERAN = { pemilik: 'Pemilik', kasir: 'Kasir', staf_gudang: 'Staf Gudang' } as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profil = await getSessionProfile()
  if (!profil) redirect('/login')
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sky-900 p-4 text-sky-50 md:w-60 md:shrink-0 print:hidden">
        <div className="mb-4 text-xl font-bold">Toko Asri</div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {menuFor(profil.peran).map((m) => (
            <Link key={m.href} href={m.href} className="rounded px-3 py-2 text-sm hover:bg-sky-800">{m.label}</Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-sky-700 pt-3 text-sm">
          <div className="font-medium">{profil.nama}</div>
          <div className="text-sky-300">{NAMA_PERAN[profil.peran]}</div>
          <form action={logout}><button className="mt-2 rounded border border-sky-600 px-3 py-1 text-xs hover:bg-sky-800">Keluar</button></form>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  )
}
