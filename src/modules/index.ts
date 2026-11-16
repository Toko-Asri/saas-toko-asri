/**
 * Daftar modul aplikasi Toko Asri.
 * Setiap modul punya folder sendiri di src/modules/<kode>/ (logika bisnis)
 * dan src/app/(dashboard)/<kode>/ (halaman).
 */
export type ModuleInfo = {
  kode: "erp" | "scm" | "crm";
  nama: string;
  deskripsi: string;
  fitur: string[];
};

export const MODULES: ModuleInfo[] = [
  {
    kode: "erp",
    nama: "ERP",
    deskripsi: "Pengelolaan sumber daya internal toko.",
    fitur: ["Penjualan & kasir", "Keuangan", "Karyawan", "Laporan"],
  },
  {
    kode: "scm",
    nama: "SCM",
    deskripsi: "Rantai pasok produk frozen food dari supplier sampai rak toko.",
    fitur: ["Data supplier", "Pembelian (PO)", "Stok & gudang", "Kedaluwarsa & suhu"],
  },
  {
    kode: "crm",
    nama: "CRM",
    deskripsi: "Hubungan dan loyalitas pelanggan.",
    fitur: ["Data pelanggan", "Riwayat belanja", "Promo & poin", "Keluhan"],
  },
];

export function getModule(kode: ModuleInfo["kode"]): ModuleInfo {
  const m = MODULES.find((x) => x.kode === kode);
  if (!m) throw new Error(`Modul tidak dikenal: ${kode}`);
  return m;
}
