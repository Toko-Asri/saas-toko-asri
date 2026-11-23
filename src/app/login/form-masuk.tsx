'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react'
import { login } from './actions'

const kolom =
  'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-xs transition ' +
  'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:shadow-glow'

function TombolMasuk() {
  const { pending } = useFormStatus()
  return (
    <button
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-700 to-brand-800 py-3 text-sm font-semibold text-white shadow-md shadow-brand-700/25 transition hover:from-brand-800 hover:to-brand-900 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <><LoaderCircle aria-hidden className="size-4 animate-spin" /> Memproses…</> : 'Masuk'}
    </button>
  )
}

// Formulir tetap memakai Server Action `login` yang sama (logika autentikasi tidak diubah).
export function FormMasuk({ galat }: { galat?: string }) {
  const [lihat, setLihat] = useState(false)
  return (
    <form action={login} className="space-y-5">
      {galat && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-fade-in">{galat}</p>
      )}
      <label className="block text-sm font-medium text-slate-700">
        Email
        <span className="relative mt-1.5 block">
          <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="email" type="email" required autoComplete="email" placeholder="nama@toko.id" className={kolom} />
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Kata sandi
        <span className="relative mt-1.5 block">
          <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="password" type={lihat ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••" className={`${kolom} pr-12`} />
          <button
            type="button"
            onClick={() => setLihat((v) => !v)}
            aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={lihat}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {lihat ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          </button>
        </span>
      </label>
      <TombolMasuk />
    </form>
  )
}
