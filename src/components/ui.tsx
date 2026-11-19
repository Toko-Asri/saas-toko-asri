import type { ReactNode } from 'react'

export const inputCls = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm'
export const btnCls = 'rounded bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800'
export const btnGhostCls = 'rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm text-slate-700">{label}{children}</label>
}

export function Banner({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
  if (ok) return <p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>
  return null
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  )
}
