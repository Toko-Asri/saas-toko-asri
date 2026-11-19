import { logout } from '../login/actions'

export default function AkunBelumAktif() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 p-4">
      <div className="max-w-sm space-y-4 rounded-xl bg-white p-6 text-center shadow">
        <h1 className="text-xl font-bold text-sky-800">Akun belum diaktifkan</h1>
        <p className="text-sm text-slate-600">Akun Anda sudah terdaftar tetapi belum diberi peran (pemilik, kasir, atau staf gudang). Hubungi pemilik toko.</p>
        <form action={logout}><button className="rounded border px-4 py-2 text-sm hover:bg-slate-50">Keluar</button></form>
      </div>
    </main>
  )
}
