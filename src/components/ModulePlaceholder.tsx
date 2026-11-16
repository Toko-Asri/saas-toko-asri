import Link from "next/link";
import { getModule, type ModuleInfo } from "@/modules";

export function ModulePlaceholder({ kode }: { kode: ModuleInfo["kode"] }) {
  const m = getModule(kode);
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Kembali ke beranda
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Modul {m.nama}</h1>
      <p className="mt-2 text-neutral-600">{m.deskripsi}</p>
      <h2 className="mt-8 font-semibold">Fitur yang direncanakan</h2>
      <ul className="mt-2 list-disc pl-6 text-neutral-700">
        {m.fitur.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-8 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
        Halaman ini masih kerangka. Fitur akan dibangun di tahap berikutnya.
      </p>
    </main>
  );
}
