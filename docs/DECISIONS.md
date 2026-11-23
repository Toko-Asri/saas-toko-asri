# Daftar Keputusan (Decision Log)
## SaaS Toko Asri

Versi 1.0-draf · 12 November 2026

Status yang dipakai:

| Status | Arti |
| --- | --- |
| **Ditetapkan** | Dinyatakan langsung oleh Naurah [K] |
| **Usulan — menunggu Naurah** | Rekomendasi penyusun; belum disetujui. Dokumen ditulis seolah usulan diterima, dan bagian yang terdampak ditandai |
| **Perlu konfirmasi mitra** | Hanya pemilik Toko Asri yang bisa menjawab; dipakai sebagai asumsi sementara |
| **Ditunda** | Sengaja di luar MVP |

Tidak ada keputusan di daftar ini yang diklaim sudah disetujui kecuali berstatus "Ditetapkan".

---

## 1. Keputusan dokumen fundamental

| ID | Keputusan | Status | Alasan | Dampak bila berbeda | Dirujuk di |
| --- | --- | --- | --- | --- | --- |
| DEC-01 | Seluruh analisis, perancangan, pengembangan, dan integrasi ERP–SCM–CRM dikerjakan Naurah sebagai **satu aplikasi**. Pembagian per anggota kelompok tidak dipakai. Keputusan Tahap 4 yang sebelumnya ditujukan ke "tim integrasi", Kayla, atau Rei kini diputuskan Naurah. | **Ditetapkan** (master prompt dokumen fundamental) | — | — | PRD §1.1, README |
| DEC-02 | Stack: Python 3 + Flask + Jinja2 (server-rendered) + REST `/api/v1` + PostgreSQL 16. | Usulan — menunggu Naurah | Sudah terbukti di prototipe (61 tes lulus); satu bahasa; PostgreSQL mendukung constraint dan transaksi yang dibutuhkan idempotency | Mengganti stack berarti menulis ulang prototipe; dokumen PRD/DESIGN/RULES tetap berlaku, ARCHITECTURE §2.1 dan SCHEMA perlu disesuaikan | ARCH §2.1, SCHEMA |
| DEC-03 | Modular monolith + satu database dengan skema per modul. Pemisahan hak database per skema ditunda ke pascapilot. | Usulan — menunggu Naurah | Skala toko kecil; transaksi stok butuh atomik lintas modul; satu orang pengembang | Layanan terpisah butuh mekanisme outbox/saga dan pengujian ulang idempotency (Tahap 4 §6.4) | ARCH §2.1, SCHEMA §4.1/4.4, RULES INT-10 |
| DEC-04 | ERP satu-satunya pengubah saldo, lewat `erp.ajukan_kejadian_stok` dengan idempotency I-1..I-4 dan mekanisme K-M1..K-M8. | Usulan — menunggu Naurah (Tahap 4 E-02, sebelumnya untuk Kayla) | Mencegah stok ganda/hilang; sudah diuji UJI-1..19 | Inti integrasi; tidak disarankan diubah | ARCH §2.3–2.4, SCHEMA §4.5, RULES INT-01..08 |
| DEC-05 | Tiga lapis status (dokumen, pemrosesan stok, log teknis). | Usulan — menunggu Naurah (Tahap 4 S-03) | Pengguna tahu apakah stok sudah berubah; kegagalan teknis tidak disamarkan | Tanpa lapis 2, kirim ulang tidak aman | RULES §5.6, DESIGN §3.4 |
| DEC-06 | Retry hanya manual (tombol Kirim ulang); tanpa retry otomatis di MVP. | Usulan — menunggu Naurah | Retry otomatis yang tak terlihat menyulitkan audit untuk toko kecil | Retry otomatis perlu job terjadwal + batas percobaan | RULES INT-06, ERR-03 |
| DEC-07 | Lima role: **Super Admin** (baru, hanya kelola pengguna & log), Admin Pusat, Admin Cabang, Petugas Gudang, **Kasir** (mengganti nama `STAF_PENJUALAN`). | Usulan — menunggu Naurah. Admin Pusat/Cabang = fakta; Petugas Gudang = asumsi A2 | Pemisahan tugas pengelola akun; nama Kasir lebih dikenal mitra | Bila Super Admin ditolak: kelola pengguna dipindah ke Admin Pusat (G-01 batal) | PRD §1.2, DESIGN §3.3, RULES §5.4, SCHEMA §4.6 |
| DEC-08 | Satu role per akun di MVP. | Usulan — menunggu Naurah | Sederhana; matriks hak jelas | Banyak role per akun butuh tabel relasi pengguna–role | PRD §1.2, RULES §5.4 |
| DEC-09 | Data pelanggan dipakai bersama semua cabang. | Usulan — menunggu Naurah | Satu pelanggan (mis. reseller) dapat membeli di cabang mana pun | Data per cabang menambah kolom cabang & duplikasi | RULES §5.4 |
| DEC-10 | Pesanan Baru tidak mencadangkan stok (AS-13); stok berkurang saat dikonfirmasi. | Usulan — menunggu Naurah | Menghindari stok "tertahan" untuk pesanan yang tidak jadi | Pencadangan butuh status stok tambahan | RULES BR-CUS-05 |
| DEC-11 | Admin Pusat boleh menyetujui PR yang dibuatnya sendiri. | Usulan — menunggu Naurah | Pengguna kantor sedikit | Larangan perlu dua akun Admin Pusat | RULES BR-APR-06 |
| DEC-12 | Rekonsiliasi REK-1..4 baca-saja, dijalankan harian; tidak memperbaiki otomatis. | Usulan — menunggu Naurah | Koreksi stok harus melewati persetujuan kantor (W15) | — | ARCH §2.4, SCHEMA §4.5, RULES INV-09 |
| DEC-13 | Migration hanya maju (tanpa skrip down); pemulihan lewat backup. | Usulan — menunggu Naurah | Menghindari hilangnya jejak stok | Skrip down perlu ditulis dan diuji per migration | SCHEMA §4.6 |
| DEC-14 | Tidak ada deployment publik dan tidak ada migration ke database produksi tanpa persetujuan eksplisit Naurah. | **Ditetapkan** (master prompt) | — | — | ARCH §2.5 deployment, SCHEMA §4.6 |
| DEC-15 | `statement_timeout` 15 detik untuk role aplikasi (G-06). | Usulan — menunggu Naurah | Mencegah kueri menggantung | — | ARCH §2.4 timeout, RULES ERR-04 |
| DEC-16 | Format nomor batch bila kemasan supplier tidak mencantumkan nomor. | Perlu konfirmasi mitra | Belum diketahui kebiasaan gudang | Validasi format nomor batch | RULES INV-04 |

---

## 2. Keputusan terbuka dari Tahap 4 (dipetakan ulang setelah DEC-01)

| Kode Tahap 4 | Keputusan | Sebelumnya kepada | Kini | Usulan di dokumen fundamental |
| --- | --- | --- | --- | --- |
| S-01 | Tahap 3 v0.2 sebagai acuan | Naurah | Naurah | Dipakai sebagai acuan PRD |
| S-02, C-04 | Koreksi kalimat "habis atau menipis" | Naurah | Naurah | PRD hanya memakai fakta "lapor stok habis harian" (W9); kondisi menipis ditangani lewat rekomendasi pengadaan (FR-SCM-12) [R]. Koreksi kalimat di Tahap 3 tetap menunggu persetujuan |
| S-03, C-18 | Tiga lapis status | Naurah | Naurah | DEC-05 |
| S-05, C-06 | Dasar BR-01 transfer | Naurah | Naurah | RULES BR-TRF-01 merujuk W1, W5 |
| P-01, P-02 | Arsitektur & database | Tim integrasi | Naurah | DEC-02, DEC-03 |
| P-03, C-05 | Pemilik login & daftar role | Tim integrasi | Naurah | Platform `core`; DEC-07 |
| P-04 | Layanan bersama notifikasi/log | Tim integrasi | Naurah | Platform `core` |
| P-05, E-05, E-06, C-19 | Supplier milik SCM, produk milik ERP, parameter stok di SCM | Tim + Kayla | Naurah | SCHEMA §4.4 |
| P-07, E-02 | Perilaku unique constraint & lock timeout | Tim + Kayla | Naurah | DEC-04; lock_timeout 5 s |
| E-01 | Saldo per batch per cabang di ERP | Kayla | Naurah | SCHEMA `erp.saldo_batch` |
| E-03, R-03 | Pesanan CRM → penjualan ERP | Kayla + Rei | Naurah | RULES BR-CUS-06 |
| E-04, C-10 | Barang dalam perjalanan di SCM saja | Kayla | Naurah | RULES BR-TRF-06 |
| E-07 | Data penjualan yang boleh dibaca SCM | Kayla | Naurah | View `erp.v_penjualan_harian` |
| E-08 | Saldo awal & migrasi data | Kayla | Naurah | FR-ERP-09, kunci `SALDO-AWAL-*` |
| E-09, K-21 | Catatan kerugian keuangan rusak/hilang | Kayla | Naurah | **Ditunda** (bukan MVP; hanya dicatat di dokumen transfer/penyesuaian) |
| R-01, C-01–C-03 | WhatsApp, member, utang pelanggan | Rei | Naurah + mitra | WhatsApp = kanal saja; member = penanda; utang **di luar MVP** |
| R-02, C-13 | Stok layak jual vs dapat dijanjikan | Rei + Kayla | Naurah | Stok layak jual (DEC-10) |
| R-04, R-05 | Estimasi kedatangan & sinyal permintaan | Rei | Naurah | **Ditunda** (FR-CRM-07, 08 Post-MVP) |
| M-04, AS-15, C-06 | Perlu tidaknya persetujuan transfer & penyetujunya | Mitra | **Perlu konfirmasi mitra** | Asumsi: Admin Pusat menyetujui |
| M-01, C-04 | Pelaporan stok menipis | Mitra | Perlu konfirmasi mitra | Rekomendasi pengadaan + notifikasi |
| M-02, AS-9 | Siapa yang meminta pemindahan | Mitra | Perlu konfirmasi mitra | Admin Cabang asal/tujuan atau Admin Pusat |
| M-03, K-14 | Penanganan rusak/kurang saat transfer | Mitra | Perlu konfirmasi mitra | RULES BR-TRF-07..09 |
| M-05, M-06, AS-8, AS-10 | Supplier kirim langsung ke toko; satu PO per toko | Mitra | Perlu konfirmasi mitra | Asumsi: ya, satu PO = satu supplier + satu cabang |

---

## 3. Selisih dokumen vs prototipe (gap)

Selisih ini adalah keputusan implementasi yang **menunggu persetujuan dokumen**. Belum dikerjakan karena master prompt melarang coding sebelum dokumen siap direview.

| ID | Selisih | Dokumen | Rencana |
| --- | --- | --- | --- |
| G-01 | Role `SUPER_ADMIN` belum ada | PRD §1.2, RULES §5.4 | Migration 0006 (a)(b) bila DEC-07 disetujui |
| G-02 | Role `STAF_PENJUALAN` → `KASIR` | PRD §1.2 | Migration 0006 (a) + ubah label UI |
| G-03 | UI manajemen pengguna (SCR-07) | FR-COR-02 | Layar + API `/api/v1/core/pengguna` |
| G-04 | Form saldo awal (SCR-23) | FR-ERP-09 | Layar + API `/api/v1/erp/saldo-awal` |
| G-05 | Halaman rekonsiliasi (SCR-08) | FR-COR-06 | View `erp.v_rekonsiliasi` + layar (kueri sudah diuji) |
| G-06 | `statement_timeout` 15 s | ARCH §2.4 | Migration 0006 (d) |
| G-07 | Rate limit login | NFR-SEC | Batas percobaan per username/IP |

---

## 4. Daftar yang perlu disetujui Naurah (ringkas)

1. Kelima dokumen fundamental sebagai acuan implementasi.
2. DEC-02 stack.
3. DEC-03 modular monolith + satu database.
4. DEC-04..06 aturan integrasi stok.
5. DEC-07 lima role (Super Admin & Kasir).
6. DEC-08 satu role per akun.
7. DEC-09..11 aturan pelanggan/pesanan/persetujuan.
8. DEC-12, 13, 15 rekonsiliasi, migration, timeout.
9. Urutan pengerjaan G-01..G-07 setelah persetujuan.
10. Pertanyaan untuk mitra (bagian 2, status "Perlu konfirmasi mitra") beserta DEC-16.
