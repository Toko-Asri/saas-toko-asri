# Desain SaaS Toko Asri (ERP + SCM + CRM)

Tanggal: 2026-11-19 · Status: disetujui pengguna

## Maksud
Tugas akhir mata kuliah SIM: aplikasi untuk toko retail frozen food yang menggabungkan
ERP, SCM, dan CRM. Dinilai lewat demo langsung, sehingga **integrasi antarmodul harus
terlihat jelas**: penjualan mengurangi stok → stok menipis memunculkan saran pembelian
ke pemasok → transaksi memperbarui data pelanggan. Pemilik toko mendapat dashboard ringkasan.

## Tujuan
- Aplikasi bisa didemokan dengan data contoh (produk, pemasok, pelanggan, transaksi).
- Tiga peran: pemilik, kasir, staf gudang, dengan hak akses berbeda.
- Spesifik frozen food: batch, tanggal kedaluwarsa, lokasi/suhu penyimpanan, FEFO.
- README: cara menjalankan (termasuk setup Supabase), fitur per modul, diagram alur bisnis (Mermaid).

## Bukan tujuan
- Multi-tenant sungguhan, penagihan SaaS, pembayaran online, integrasi sensor suhu nyata.
- Akuntansi lengkap (hanya penjualan, HPP, laba kotor).

## Anti-tujuan
- Integrasi yang hanya "tampak" di UI tanpa konsistensi data.
- Menjalankan migration ke database produksi atau deploy publik tanpa persetujuan.

## Pendekatan (dipilih: A)
- **A (dipilih):** logika kritis di Postgres (RPC + trigger); Next.js hanya antarmuka. Atomik dan konsisten.
- B: semua di Server Actions, tidak atomik tanpa transaksi manual.
- C: gabungan, batas tanggung jawab kabur.

## Keputusan teknis
- Next.js App Router + TypeScript + Tailwind, `@supabase/ssr`, UI Bahasa Indonesia, format Rupiah.
- Auth Supabase; tabel `profiles(id, nama, peran)` dengan peran `pemilik | kasir | staf_gudang`; RLS di semua tabel.
- Akses: pemilik semua; kasir penjualan + pelanggan (baca stok); staf gudang inventori + pembelian.
- Migration di `supabase/migrations/`, seed di `supabase/seed.sql`; **hanya dijalankan oleh pengguna** di proyek Supabase demo.
- Verifikasi SQL oleh saya memakai Postgres lokal sementara (bukan Supabase pengguna).

## Model data (ringkas)
- SCM: `suppliers`, `products` (min_stock, reorder_qty, supplier_id, harga beli/jual), `storage_locations` (suhu),
  `batches` (product, qty, exp_date, lokasi), `purchase_orders` + `purchase_order_items`, `purchase_suggestions`.
- ERP: `sales`, `sale_items` (per batch, HPP), `stock_adjustments`.
- CRM: `customers` (poin, total belanja, tier), `sales.customer_id`.
- Fungsi: `receive_goods()` (PO → batch baru), `checkout()` (FEFO, atomik, update pelanggan),
  trigger saran pembelian saat stok total ≤ min_stock.

## Tahap (tiap tahap: `npm run build` lulus, push, PR ke main, tampilkan hasil sebelum lanjut)
1. SCM: pemasok, produk, batch/lokasi, pesanan pembelian, penerimaan barang, saran pembelian, login + peran, README setup Supabase.
2. ERP: kasir/POS, FEFO, keuangan sederhana, penyesuaian stok.
3. CRM: pelanggan, riwayat, poin/tier, segmentasi.
4. Integrasi: dashboard pemilik, alur penuh, README final + diagram Mermaid.

## Diserahkan ke builder
Struktur folder, komponen UI, nama kolom detail, desain visual, aturan poin/tier (proposal: 1 poin per Rp10.000; tier Silver/Gold berdasarkan total belanja).
