import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 p-4">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold text-sky-800">Toko Asri</h1>
          <p className="text-sm text-slate-500">Masuk untuk mengelola toko frozen food</p>
        </div>
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <label className="block text-sm">Email
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block text-sm">Kata sandi
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="w-full rounded bg-sky-700 py-2 font-medium text-white hover:bg-sky-800">Masuk</button>
      </form>
    </main>
  )
}
