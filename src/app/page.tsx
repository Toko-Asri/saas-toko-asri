import Link from "next/link";
import { MODULES } from "@/modules";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        Toko Asri · Frozen Food
      </p>
      <h1 className="mt-2 text-4xl font-bold">SaaS ERP, SCM &amp; CRM</h1>
      <p className="mt-3 max-w-2xl text-neutral-600">
        Satu aplikasi untuk mengelola operasional toko, rantai pasok, dan
        pelanggan Toko Asri.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.kode}
            href={`/${m.kode}`}
            className="rounded-xl border border-neutral-200 p-5 transition hover:border-emerald-500 hover:shadow-sm"
          >
            <h2 className="text-xl font-semibold">{m.nama}</h2>
            <p className="mt-1 text-sm text-neutral-600">{m.deskripsi}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
