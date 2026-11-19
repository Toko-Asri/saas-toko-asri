# Toko Asri Tahap 4 (Integrasi dan Dashboard Pemilik) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyatukan SCM, ERP, dan CRM menjadi satu pengalaman: dashboard ringkasan untuk pemilik (angka penjualan, stok, pelanggan, tindakan yang perlu diambil, aktivitas lintas modul), beranda yang sesuai untuk kasir dan staf gudang, pemeriksaan integritas data lintas modul, uji alur penuh dari ujung ke ujung, dan dokumentasi final (arsitektur, ERD, skrip demo).

**Architecture:** Sama seperti Tahap 1–3: agregasi dan aturan lintas modul di Postgres (RPC `security definer` yang memeriksa peran), Next.js hanya antarmuka. Angka dashboard tidak dihitung ulang di TypeScript: semuanya dibaca dari RPC dan diuji **cocok** dengan sumber kebenaran yang sudah ada (`laporan_keuangan`, `laporan_produk`, `stok_layak`, `pelanggan_segmen`). Fungsi murni TypeScript hanya untuk presentasi (persentase perubahan, daftar tindakan). Perubahan skema HANYA lewat file migration baru (Tahap 1–3 sudah dijalankan pengguna di Supabase demo).

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind, `@supabase/ssr`, Vitest, Postgres 16 lokal untuk uji SQL.

**Spec:** `docs/superpowers/specs/2026-11-19-toko-asri-design.md` (Tahap 4: integrasi, dashboard pemilik, README final dengan diagram Mermaid); lanjutan dari `docs/superpowers/plans/2026-11-19-tahap3-crm.md`.

## Global Constraints

- UI Bahasa Indonesia; Rupiah lewat `formatRupiah`, tanggal lewat `formatTanggal`; "hari ini" selalu tanggal **Asia/Jakarta** (`hariIniJakarta()`/`rentangPeriode()` di TS, `(now() at time zone 'Asia/Jakarta')::date` di SQL).
- Migration hanya file baru di `supabase/migrations/` (`2026112x...`, berurutan setelah `20261120000800`); tidak mengedit migration lama; tidak dijalankan ke Supabase pengguna; uji hanya di Postgres lokal via `supabase/tests/run.sh`.
- Periode dashboard: `hari-ini`, `7-hari`, `30-hari`, `bulan-ini` (sama dengan `rentangPeriode`); bawaan `7-hari`. **Periode pembanding** = rentang sebelumnya dengan jumlah hari yang sama persis (mis. 7 hari → 7 hari sebelumnya); untuk `bulan-ini` pembanding = jumlah hari yang sama sebelum tanggal 1.
- Definisi angka (sumber tunggal di SQL, dipakai persis di UI): `penjualan = Σ sales.total`; `hpp = Σ sale_items.qty × hpp_satuan`; `laba_kotor = penjualan − hpp`; `transaksi = count(sales)`; `transaksi_member = count(sales dengan customer_id)`; `rata_transaksi = penjualan / transaksi` (0 bila tanpa transaksi); `nilai_persediaan = Σ batches.qty × coalesce(batches.harga_beli, products.harga_beli)` hanya batch **layak jual** (`tgl_kedaluwarsa` > hari ini WIB); `nilai_kedaluwarsa` = idem untuk batch yang sudah kedaluwarsa dan `qty > 0`; "hampir kedaluwarsa" = batch layak jual dengan sisa ≤ 14 hari (sama dengan `expiryStatus`).
- Peran: `pemilik` melihat dashboard penuh; `staf_gudang` hanya panel stok/SCM; `kasir` hanya ringkasan penjualannya sendiri hari ini dan pintasan; **kasir dan staf gudang tidak pernah menerima angka laba, HPP, biaya, atau data pelanggan agregat**. RPC pemilik menolak peran lain dengan galat `Tidak diizinkan`.
- Fungsi `security definer` memakai `set search_path = public, pg_temp`; execute dicabut dari `public, anon`.
- Data kosong harus aman: tanpa penjualan/pelanggan/PO, semua RPC dan halaman menghasilkan nol dan teks "belum ada", tanpa galat, `NaN`, atau pembagian dengan nol.
- Setiap tugas: tes gagal dulu, lalu implementasi; akhir tugas `npm test` + `npm run build` + `npm run lint` (dan `run.sh` untuk tugas SQL) lulus; commit berakhiran trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` dan `Claude-Session: https://claude.ai/code/session_01NjswzVeNpJvCu4pynPEeRZ`.
- Branch kerja: branch baru dari `main` (nama `claude/tahap4-integrasi`); PR ke `main` di akhir tahap; push/PR hanya sesuai permintaan pengguna.

## Review Focus

- Angka dashboard **sama persis** dengan `laporan_keuangan`/`laporan_produk` untuk periode yang sama, dan `nilai_persediaan` sama dengan penjumlahan `stok_layak × biaya` — Task 1.
- Batas hari WIB: penjualan pukul 00:30 WIB masuk hari WIB-nya (bukan hari UTC); periode pembanding tepat sepanjang periode utama; pembanding bernilai 0 → tren `null`, bukan pembagian dengan nol — Task 1 dan Task 3.
- Database kosong (tanpa penjualan, pelanggan, PO): semua RPC dan halaman bernilai nol tanpa galat — Task 1 dan Task 4.
- Kasir dan staf gudang tidak dapat memanggil RPC pemilik; kasir tidak melihat laba/HPP/biaya di beranda; staf gudang tidak melihat penjualan atau pelanggan — Task 1 dan Task 5.
- Pemeriksa integritas **mendeteksi** data rusak (poin pelanggan tidak cocok dengan penjualan, total penjualan tidak sama dengan jumlah itemnya, stok negatif, dua saran terbuka untuk produk yang sama) dan tidak memberi alarm palsu pada seed — Task 2.
- Alur penuh dari ujung ke ujung (terima barang → jual ke pelanggan → stok menipis → saran → PO → terima → tier naik → laporan dan dashboard konsisten) lulus sebagai satu skenario — Task 2.
- Umpan aktivitas tidak membocorkan data di luar peran pemilik, urut terbaru, dan dibatasi jumlahnya — Task 1.
- Dokumentasi: langkah demo di README benar-benar dapat diikuti dari seed (nama produk, pelanggan, angka sesuai data seed) — Task 8.

## File Structure

```
supabase/migrations/20261120000900_dashboard.sql         RPC dashboard_ringkasan, dashboard_stok, pelanggan_teratas, aktivitas_terbaru
supabase/migrations/20261120001000_integritas.sql        RPC cek_integritas
supabase/tests/dashboard_test.sql                        uji SQL dashboard + rekonsiliasi (dipanggil run.sh)
supabase/tests/integrasi_test.sql                        uji alur penuh lintas modul + integritas (dipanggil run.sh)
supabase/migrations/20261120001100_integritas_minor.sql  (opsional, Task 7) telepon dan retry idempoten
src/lib/dashboard.ts, dashboard.test.ts                  perubahan %, periode pembanding, daftar tindakan
src/components/grafik.tsx                                GrafikHarian (dipakai laporan dan dashboard)
src/app/(app)/page.tsx                                   (ubah) beranda per peran
src/app/(app)/beranda/{pemilik.tsx,kasir.tsx,gudang.tsx} bagian beranda per peran
src/app/(app)/laporan/page.tsx                           (ubah) memakai GrafikHarian
docs/DEMO.md                                             skrip demo terpandu
README.md                                                (ubah) final: arsitektur, ERD, alur terintegrasi, peran, demo
```

---

### Task 1: RPC dashboard (ringkasan, stok, pelanggan teratas, aktivitas)

**Files:** Create `supabase/migrations/20261120000900_dashboard.sql`, `supabase/tests/dashboard_test.sql`; Modify `supabase/tests/run.sh` (jalankan `dashboard_test.sql` setelah `crm_test.sql`).

**Interfaces:**
- Produces:
  - `dashboard_ringkasan(p_dari date, p_sampai date) returns table(penjualan numeric, hpp numeric, laba_kotor numeric, transaksi int, transaksi_member int, rata_transaksi numeric, kerugian_stok numeric, penjualan_sebelumnya numeric, laba_sebelumnya numeric, transaksi_sebelumnya int, pelanggan_baru int)` — satu baris; hanya `pemilik`; rentang 1–366 hari, `p_sampai >= p_dari`; pembanding = rentang sebelumnya sepanjang `p_sampai - p_dari + 1` hari; `kerugian_stok` = Σ `stock_adjustments.nilai > 0` pada rentang; `pelanggan_baru` = `customers` terdaftar pada rentang (tanggal WIB).
  - `dashboard_stok() returns table(nilai_persediaan numeric, nilai_kedaluwarsa numeric, produk_aktif int, produk_di_bawah_minimum int, produk_habis int, saran_terbuka int, batch_hampir_kedaluwarsa int, nilai_hampir_kedaluwarsa numeric, batch_kedaluwarsa int, po_menunggu int, nilai_po_menunggu numeric)` — satu baris; `pemilik` atau `staf_gudang`; `produk_di_bawah_minimum` = produk aktif dengan total stok ≤ `min_stock` (sama dengan aturan saran); `produk_habis` = produk aktif tanpa stok layak jual; `po_menunggu` = PO berstatus `dipesan` (nilai = Σ `(qty_pesan − qty_diterima) × harga_beli`).
  - `pelanggan_teratas(p_dari date, p_sampai date, p_limit int default 5) returns table(customer_id uuid, nama text, tier text, transaksi int, belanja numeric, poin int)` — urut `belanja desc`, hanya `pemilik`, `p_limit` dibatasi 1–50, hanya penjualan berpelanggan pada rentang.
  - `aktivitas_terbaru(p_limit int default 15) returns table(waktu timestamptz, jenis text, judul text, rincian text, tautan text)` — hanya `pemilik`, `p_limit` dibatasi 1–50, urut terbaru; `jenis` ∈ `penjualan`, `penyesuaian_stok`, `saran_pembelian`, `po_dibuat`, `pelanggan_baru`; `tautan` = rute aplikasi (mis. `/kasir/riwayat/<id>`, `/gudang/saran`, `/gudang/pembelian/<id>`, `/pelanggan/<id>`, `/gudang/penyesuaian`).
- Consumes: `sales`, `sale_items`, `stock_adjustments`, `batches`, `products`, `stok_layak`, `purchase_orders`, `purchase_order_items`, `purchase_suggestions`, `customers`, `current_peran()`.

- [ ] **Step 1:** Tulis `dashboard_test.sql` (pola `tst.assert`/`tst.expect_error`/`tst.sudo` seperti `crm_test.sql`; fixture + rollback): (a) **database kosong**: semua RPC mengembalikan nol/baris kosong tanpa galat (jalankan sebelum fixture di dalam transaksi, atau hapus data dahulu lewat `tst.sudo` dalam transaksi); (b) fixture: dua penjualan di hari ini (satu berpelanggan, satu tamu) dan satu penjualan pukul 00:30 WIB kemarin (tanggalnya digeser lewat `update sales set created_at`), satu penyesuaian rusak, satu pelanggan baru → `dashboard_ringkasan(h, h)`: `penjualan`, `hpp`, `laba_kotor`, `transaksi = 2`, `transaksi_member = 1`, `rata_transaksi = penjualan/2`, `kerugian_stok`, `pelanggan_baru = 1` benar; `dashboard_ringkasan(h-1, h)` memuat penjualan 00:30 WIB; (c) **rekonsiliasi**: untuk rentang uji `sum(laporan_keuangan.penjualan) = dashboard_ringkasan.penjualan`, idem `hpp`, `laba_kotor`, `kerugian_stok`, `jumlah_transaksi`; `laporan_produk` dijumlah = `penjualan`; (d) pembanding: rentang 3 hari menghasilkan `penjualan_sebelumnya` = penjualan 3 hari tepat sebelumnya; tidak ada transaksi di pembanding → 0 (bukan null); (e) `dashboard_stok`: fixture produk dengan batch layak, batch kedaluwarsa hari ini (WIB), batch +14 hari, batch +15 hari; `nilai_persediaan` hanya batch layak jual dikali biaya batch (fallback harga produk), `nilai_kedaluwarsa` hanya batch kedaluwarsa, `batch_hampir_kedaluwarsa` menghitung +14 hari tetapi bukan +15, `produk_di_bawah_minimum` tepat sama dengan jumlah saran terbuka pada kondisi tanpa saran diabaikan, `produk_habis`, `po_menunggu`/`nilai_po_menunggu` termasuk penerimaan sebagian; `nilai_persediaan` sama dengan `sum(stok_layak.stok × biaya)` dihitung terpisah; (f) `pelanggan_teratas` urut belanja, mengabaikan tamu, `p_limit` 0 dan 1000 dibatasi; (g) `aktivitas_terbaru`: memuat kelima jenis, urut terbaru, `p_limit` dibatasi, tautan berpola benar; (h) izin: `kasir` dan `staf_gudang` ditolak pada `dashboard_ringkasan`, `pelanggan_teratas`, `aktivitas_terbaru`; `kasir` ditolak pada `dashboard_stok`, `staf_gudang` dan `pemilik` diterima; `p_sampai < p_dari`, rentang 367 hari ditolak.
- [ ] **Step 2:** `run.sh` → harus gagal (fungsi belum ada). Expected: `ERROR` pada `dashboard_test.sql`.
- [ ] **Step 3:** Tulis migration sesuai Interfaces. Pakai CTE per sumber (pola `laporan_keuangan`), `#variable_conflict use_column`, revoke dari `public, anon`, grant ke `authenticated`. Tambahkan indeks `purchase_suggestions(status)` dan `purchase_orders(status)` bila rencana kueri membutuhkannya.
- [ ] **Step 4:** `run.sh` lulus. **Step 5:** commit `feat(dashboard): RPC ringkasan, stok, pelanggan teratas, aktivitas`.

### Task 2: Pemeriksa integritas dan uji alur penuh lintas modul

**Files:** Create `supabase/migrations/20261120001000_integritas.sql`, `supabase/tests/integrasi_test.sql`; Modify `supabase/tests/run.sh` (jalankan `integrasi_test.sql` setelah `dashboard_test.sql`).

**Interfaces:**
- Produces: `cek_integritas() returns table(kode text, nama text, ok boolean, jumlah_masalah int, contoh text)` — hanya `pemilik`; satu baris per pemeriksaan: `poin_pelanggan` (`customers.poin` = Σ `sales.poin`), `belanja_pelanggan` (`customers.total_belanja` = Σ `sales.total` per pelanggan dan `jumlah_transaksi` = jumlah penjualan), `tier_pelanggan` (`tier` = `tier_dari(total_belanja)`), `total_penjualan` (`sales.total` = Σ `sale_items.qty × harga_jual`), `stok_negatif` (tidak ada `batches.qty < 0`), `penerimaan_po` (`qty_diterima` ≤ `qty_pesan` dan PO `diterima` tidak punya sisa), `saran_ganda` (paling banyak satu saran `terbuka`/`dipesan` per produk). `contoh` memuat paling banyak tiga pengenal bermasalah, kosong bila `ok`.
- Consumes: semua tabel Tahap 1–3.
- `integrasi_test.sql` menjalankan skenario berurutan memakai RPC yang sama dengan aplikasi (peran pemilik/gudang/kasir lewat `tst.as_user`).

- [ ] **Step 1:** Tulis `integrasi_test.sql`: **skenario alur penuh** pada produk P (harga beli 6.000, harga jual 10.000, `min_stock` 5, `reorder_qty` 20) dan pelanggan C: (1) PO dibuat gudang → `dipesan` → `receive_goods` 10 unit → stok layak 10, `batches.harga_beli` tercatat; (2) kasir menjual 4 unit ke C (Rp40.000) → stok 6, C: poin 4, total 40.000; tidak ada saran; (3) kasir menjual 1 unit lagi ke C → stok 5 = `min_stock` → tepat satu saran `terbuka` (integrasi ERP→SCM); (4) gudang `create_po_from_suggestion` → saran `dipesan`, PO `draft` → `dipesan` → `receive_goods` 20 → stok 25, saran `selesai`; (5) transaksi besar membuat total C tepat Rp500.000 → tier `silver` (ERP→CRM), lalu Rp2.000.000 → `gold`; (6) penyesuaian `rusak` 2 unit → `kerugian_stok` naik, stok turun; (7) **invarian**: stok akhir = diterima − terjual − disesuaikan; `dashboard_ringkasan` pada hari ini = `laporan_keuangan` hari ini; `cek_integritas()` semua `ok`; `pelanggan_segmen` menempatkan C pada tier terbaru dan aktivitas `aktif`; `aktivitas_terbaru` memuat penjualan, saran, PO, dan penyesuaian dari skenario ini.
- [ ] **Step 2:** Tes `cek_integritas` di `integrasi_test.sql`: seed fixture bersih → semua `ok`; **mutasi** (lewat `tst.sudo`, dalam transaksi yang di-rollback): ubah `customers.poin` +1 → `poin_pelanggan` tidak `ok`, `jumlah_masalah = 1`, `contoh` memuat id pelanggan; ubah `sales.total` → `total_penjualan` gagal; `update batches set qty = -1` (lewat `tst.sudo`, constraint dilepas dengan `alter table ... drop constraint` dalam transaksi atau pakai `session_replication_role` bila constraint tidak mengizinkan, catat caranya) → `stok_negatif` gagal; sisipkan dua saran terbuka untuk produk sama (lewat `tst.sudo` dengan menonaktifkan indeks unik dalam transaksi bila perlu) → `saran_ganda` gagal; `kasir`/`staf_gudang` ditolak.
- [ ] **Step 3:** `run.sh` → gagal. **Step 4:** implementasikan migration `cek_integritas` (satu CTE per pemeriksaan, `union all`, urut `kode`). **Step 5:** `run.sh` lulus; jalankan `cek_integritas()` pada hasil `seed.sql` dan pastikan semua `ok` (bila ada alarm palsu, perbaiki **pemeriksaan atau seed**, bukan melemahkan pemeriksaan tanpa mencatat ruling).
- [ ] **Step 6:** Commit `feat(integrasi): pemeriksa integritas dan uji alur penuh`.

### Task 3: Logika presentasi dashboard (unit) dan komponen grafik bersama

**Files:** Create `src/lib/dashboard.ts`, `src/lib/dashboard.test.ts`, `src/components/grafik.tsx`; Modify `src/app/(app)/laporan/page.tsx`.

**Interfaces:**
- `dashboard.ts`: `perubahan(sekarang: number, sebelumnya: number): {persen: number | null; arah: 'naik'|'turun'|'tetap'|'baru'}` (`sebelumnya = 0` dan `sekarang > 0` → `{persen: null, arah: 'baru'}`; keduanya 0 → `{persen: 0, arah: 'tetap'}`; persen dibulatkan 1 desimal, `arah` `tetap` bila |persen| < 0,05); `labelPerubahan(p: ReturnType<typeof perubahan>): string` (`"▲ 12,5%"`, `"▼ 3,0%"`, `"● sama"`, `"baru"`); `tindakanPerluDiambil(i: {sarannTerbuka: number; batchKedaluwarsa: number; batchHampir: number; poMenunggu: number; pelangganPerluDihubungi: number; produkHabis: number; integritasMasalah: number}): Tindakan[]` dengan `Tindakan = {kode: string; teks: string; tautan: string; tingkat: 'mendesak'|'perlu'|'info'}`; hanya item dengan jumlah > 0, urut mendesak → perlu → info; aturan tingkat: `integritasMasalah` dan `batchKedaluwarsa` mendesak, `produkHabis` mendesak, `sarannTerbuka`, `poMenunggu`, `batchHampir` perlu, `pelangganPerluDihubungi` info; tautan: `/gudang/saran`, `/gudang/penyesuaian`, `/gudang/inventori?f=hampir`, `/gudang/pembelian`, `/pelanggan/segmen`, `/gudang/inventori`, `/` (integritas, bagian pemeriksa di dashboard); teks memakai bentuk jamak/angka (`"3 produk di bawah stok minimum, siapkan pesanan"`).
- `grafik.tsx`: `GrafikHarian({data, judul}: {data: {tanggal: string; penjualan: number; laba_kotor: number}[]; judul: string})` — komponen server tanpa pustaka (CSS), memakai persis markup grafik di `laporan/page.tsx` (bar penjualan + laba, `title` per hari, `role="img"` dengan `aria-label` berisi total); `laporan/page.tsx` diubah memakai komponen ini tanpa mengubah tampilan.

- [ ] **Step 1:** Tes `dashboard.test.ts`: `perubahan(120, 100)` → `{persen: 20, arah: 'naik'}`; `perubahan(90, 100)` → `{persen: -10, arah: 'turun'}`; `perubahan(100, 100)` → `{persen: 0, arah: 'tetap'}`; `perubahan(50, 0)` → `{persen: null, arah: 'baru'}`; `perubahan(0, 0)` → `{persen: 0, arah: 'tetap'}`; `perubahan(0, 50)` → `{persen: -100, arah: 'turun'}`; `perubahan(1234, 1000)` → `persen: 23.4`; `labelPerubahan` memformat `"▲ 20,0%"`, `"▼ 10,0%"`, `"● sama"`, `"baru"`; `tindakanPerluDiambil` dengan semua nol → `[]`; dengan campuran → urut `mendesak` dulu lalu `perlu` lalu `info`, setiap item punya `tautan` benar dan hanya item > 0; integritas masalah > 0 selalu paling atas.
- [ ] **Step 2:** `npm test` → gagal. **Step 3:** implementasikan `dashboard.ts` dan `grafik.tsx`, refaktor `laporan/page.tsx`. **Step 4:** `npm test`, `npm run build`, `npm run lint` lulus. **Step 5:** commit `feat(dashboard): logika presentasi dan grafik bersama`.

### Task 4: Dashboard pemilik (Beranda untuk peran pemilik)

**Files:** Create `src/app/(app)/beranda/pemilik.tsx`; Modify `src/app/(app)/page.tsx`.

**Interfaces:** Consumes `dashboard_ringkasan`, `dashboard_stok`, `pelanggan_teratas`, `aktivitas_terbaru`, `laporan_keuangan` (tren harian), `laporan_produk` (5 teratas), `cek_integritas`, view `pelanggan_segmen`, `rentangPeriode`, `perubahan`, `labelPerubahan`, `tindakanPerluDiambil`, `GrafikHarian`, `LencanaTier`. Produces `<BerandaPemilik periode: KodePeriode />` (komponen server) dan `page.tsx` yang membaca `?p=` (bawaan `7-hari`) lalu memilih komponen per peran.

Susunan halaman (urut dari atas): (1) sapaan + pemilih periode; (2) **Perlu tindakan** (kartu per `Tindakan`, kosong → "Semua beres"); (3) **kartu KPI** — penjualan, laba kotor, transaksi, rata-rata transaksi, masing-masing dengan `labelPerubahan` terhadap periode pembanding, serta porsi transaksi berpelanggan (%) dan pelanggan baru; (4) grafik harian (`GrafikHarian`); (5) panel **Stok & rantai pasok** (nilai persediaan, nilai stok kedaluwarsa, produk di bawah minimum, produk habis, PO menunggu dan nilainya, batch hampir kedaluwarsa) dengan tautan; (6) panel **Pelanggan** (jumlah per tier dan aktivitas ringkas, 5 pelanggan teratas dengan tier, tautan ke segmentasi); (7) **Produk teratas** (5 produk berdasarkan laba kotor); (8) **Aktivitas terbaru lintas modul** (15 item dengan ikon teks per `jenis`, waktu relatif WIB, tautan); (9) **Integritas data** (daftar pemeriksaan dengan tanda ✓/✗; bila ada yang gagal tampil mencolok dengan `contoh`).

- [ ] **Step 1:** Implementasikan `pemilik.tsx` (semua panggilan RPC dalam `Promise.all`; galat satu RPC tampil sebagai banner di panel itu saja, halaman tetap terbuka; semua angka dari RPC, tidak dihitung ulang; pembagian aman terhadap nol). Gunakan kelas responsif (`grid` 1 kolom di ponsel).
- [ ] **Step 2:** Ubah `page.tsx`: pemilik → `<BerandaPemilik>`; peran lain tetap sementara ke tampilan lama sampai Task 5. Hapus teks "Modul kasir tersedia pada tahap berikutnya".
- [ ] **Step 3:** Verifikasi di Postgres lokal bahwa setiap RPC yang dipanggil halaman mengembalikan nilai tidak kosong pada hasil `seed.sql` (jalankan sebagai pemilik sementara lewat `psql`, catat ringkasan angka di ledger); `npm run build`, `npm test`, `npm run lint` lulus.
- [ ] **Step 4:** Commit `feat(dashboard): dashboard pemilik`.

### Task 5: Beranda kasir dan staf gudang

**Files:** Create `src/app/(app)/beranda/kasir.tsx`, `src/app/(app)/beranda/gudang.tsx`; Modify `src/app/(app)/page.tsx`.

**Interfaces:** Consumes tabel `sales` (RLS membatasi kasir pada miliknya), `dashboard_stok` (staf gudang boleh), `rentangPeriode('hari-ini')`, `formatRupiah`. Produces `<BerandaKasir />`: jumlah transaksi dan total penjualan **milik kasir hari ini**, lima transaksi terakhir (tautan struk), tombol besar "Mulai transaksi" dan "Cari pelanggan"; tanpa angka laba/HPP/biaya. `<BerandaGudang />`: panel stok dari `dashboard_stok` **tanpa nilai rupiah persediaan** bila peran bukan pemilik/gudang (staf gudang boleh melihat nilai persediaan karena RPC mengizinkan; tidak ada data penjualan/pelanggan), daftar tindakan gudang (`sarannTerbuka`, `batchKedaluwarsa`, `batchHampir`, `poMenunggu`, `produkHabis` lewat `tindakanPerluDiambil`), pintasan ke menu gudang.

- [ ] **Step 1:** Implementasikan kedua komponen dan sambungkan di `page.tsx` per peran. **Step 2:** Verifikasi dengan membaca kode bahwa komponen kasir hanya mengkueri `sales` dan `customers` (bukan RPC pemilik) dan komponen gudang hanya `dashboard_stok` + `purchase_*`; `npm run build`, `npm test`, `npm run lint` lulus. **Step 3:** Commit `feat(dashboard): beranda kasir dan staf gudang`.

### Task 6: Dokumentasi final: README, ERD, alur terintegrasi, skrip demo

**Files:** Create `docs/DEMO.md`; Modify `README.md`.

**Interfaces:** Consumes semua tugas sebelumnya. Produces:
- README final berurutan: ringkasan dan status (semua tahap ✅), **arsitektur** (diagram Mermaid: Next.js → Supabase Auth/Postgres/RLS, RPC sebagai lapisan logika), **peran dan hak akses** (matriks peran × modul/halaman), cara menjalankan (setup Supabase yang sudah ada, daftar **seluruh** migration berurutan dari `20261119000100` hingga yang terbaru), fitur per modul (SCM, ERP, CRM, Dashboard), **ERD** (Mermaid `erDiagram` untuk `suppliers`, `products`, `storage_locations`, `batches`, `purchase_orders`, `purchase_order_items`, `purchase_suggestions`, `sales`, `sale_items`, `stock_adjustments`, `customers`, `profiles` dengan relasi sebenarnya), **alur terintegrasi ujung ke ujung** (satu diagram Mermaid `flowchart` yang menghubungkan SCM → stok → ERP → CRM → dashboard, menandai titik integrasi: penjualan mengurangi stok per batch; stok menipis memunculkan saran pembelian; transaksi memperbarui pelanggan), pengujian, struktur proyek, **keterbatasan dan pengembangan lanjut** (tanpa penukaran poin, tanpa pembayaran nyata, satu toko, data seed fiktif, migrasi manual).
- `docs/DEMO.md`: skrip demo 10–12 menit yang dapat diikuti dari seed: login per peran; (1) dashboard pemilik dan "Perlu tindakan"; (2) kasir menjual produk tertentu ke pelanggan tertentu (nama produk dan pelanggan **persis dari seed**), tunjukkan stok FEFO dan poin di struk; (3) kembali ke dashboard: penjualan naik, aktivitas terbaru memuat transaksi itu; (4) pilih produk yang stoknya tepat di atas minimum, jual hingga menyentuh minimum → saran pembelian muncul; (5) staf gudang membuat PO dari saran, menandai dipesan, menerima barang → stok naik, saran selesai; (6) segmentasi pelanggan dan "Perlu dihubungi"; (7) laporan keuangan dan pemeriksa integritas hijau; setiap langkah menyebut hasil yang diharapkan.

- [ ] **Step 1:** Tulis README dan `docs/DEMO.md`. **Step 2:** Verifikasi skrip demo terhadap hasil seed lokal: untuk setiap nama produk/pelanggan/angka yang disebut di `DEMO.md`, jalankan kueri `psql` yang membuktikannya (nama ada, stok dan minimum sesuai, tier/aktivitas pelanggan sesuai) dan catat di ledger; perbaiki dokumen (bukan seed) bila ada yang tidak cocok, kecuali seed memang perlu satu penyesuaian kecil yang dicatat sebagai ruling. **Step 3:** Pastikan setiap diagram Mermaid sintaksnya valid (render dengan `@mermaid-js/mermaid-cli` bila terpasang, atau periksa manual keyword/panah satu per satu dan catat metodenya). **Step 4:** Commit `docs: README final, ERD, alur terintegrasi, skrip demo`.

### Task 7 (opsional; hanya bila pengguna menyetujui): Pelunasan minor Tahap 2–3 yang menyangkut integritas data

**Files:** Create `supabase/migrations/20261120001100_integritas_minor.sql`; Modify `supabase/tests/crm_test.sql`.

**Interfaces:** Produces (1) `normalisasi_telepon` v2: awalan `00` dibuang (`0062812…` → `62812…`), nomor yang diawali `8` (tanpa 0/62) diberi awalan `62`; kolom `customers.telepon` mendapat `check (telepon ~ '^62[0-9]{6,13}$')` (migrasi data lama: normalkan baris yang ada, baris yang tidak valid dikosongkan dan dicatat ruling); (2) `checkout` memeriksa kunci idempotensi **sebelum** memeriksa pelanggan nonaktif, sehingga kirim ulang setelah pelanggan dinonaktifkan mengembalikan penjualan semula (urutan: validasi bentuk → cari kunci → bila ada, cocokkan sidik dan kembalikan → baru periksa/kunci pelanggan).

- [ ] **Step 1:** Tes SQL gagal-dulu: `'0062 812-3456-7890'`, `'812-3456-7890'`, `'+62 812…'`, `'0812…'` semuanya → `6281234567890`; insert telepon `'abc1'` langsung lewat kasir ditolak oleh `check`; kirim ulang kunci sama setelah pelanggan dinonaktifkan mengembalikan id penjualan yang sama (sebelumnya galat), dan penjualan baru ke pelanggan nonaktif tetap ditolak. **Step 2:** `run.sh` → gagal; implementasikan; `run.sh` + tiga skrip konkurensi lulus; simulasikan migration di atas database dengan data Tahap 3. **Step 3:** Commit `fix(crm): telepon dan retry idempoten`.

### Task 8: Verifikasi akhir, tinjauan, push

- [ ] **Step 1:** `npm test`, `npm run build`, `npm run lint`, `run.sh`, `concurrency.sh`, `erp_concurrency.sh`, `crm_concurrency.sh` semuanya lulus; simulasikan semua migration baru di atas database yang sudah menjalankan Tahap 1–3 beserta seed Tahap 3 (data lama tetap valid, `cek_integritas()` semua `ok` pada hasil seed).
- [ ] **Step 2:** Tinjauan akhir satu branch oleh reviewer terpisah (model terkuat) dengan bagian Review Focus di atas; perbaiki Critical/Important dengan tes gagal-dulu.
- [ ] **Step 3:** Push dan buka PR **hanya bila pengguna meminta**; tampilkan hasil dan berhenti. Setelah Tahap 4 selesai, proyek lengkap: serahkan ringkasan akhir (fitur, cara demo, keterbatasan).
