# Changelog Dokumentasi

Format: tanggal · versi · perubahan. Semua versi di bawah berstatus **draf, belum disetujui**.

## 12 November 2026 — Dokumen fundamental 1.0-draf (branch `docs/dokumen-fundamental`)

### Ditambahkan
- `01-product/PRD.md`: overview, role & persona, 36 FR MVP + 6 FR Post-MVP dengan acceptance criteria, NFR, flowchart proses bisnis, MVP/Post-MVP/out of scope.
- `02-architecture/ARCHITECTURE.md`: lapisan, modul & pintu publik, ownership, integrasi ERP–SCM–CRM (kontrak, transaksi, idempotency, retry, timeout, error, logging, rekonsiliasi), 10 diagram.
- `03-design/DESIGN.md`: design direction, design system (token dari prototipe), IA & menu per role, screen inventory 51 layar, wireframe untuk seluruh layar MVP (3 template + 25 khusus), 8 user flow.
- `04-database/SCHEMA.md`: konvensi, ERD lengkap (38 tabel, 77 relasi) dan ringkas, spesifikasi tabel yang dibangkitkan dari database hasil migration, ownership, integritas persediaan beserta hasil rekonsiliasi, rencana migration/seed/index/rollback.
- `05-rules/RULES.md`: 84 aturan (bisnis, persediaan, integrasi, error), matriks otorisasi 5 role, validasi 4 lapis, 7 diagram status dengan pemisahan 3 lapis status, tabel error handling.
- `06-review/TRACEABILITY_MATRIX.md`: matriks FR/NFR → arsitektur → layar → tabel → aturan, 10 pemeriksaan audit silang, validasi 29 diagram.
- `DECISIONS.md`: DEC-01..16, pemetaan ulang keputusan terbuka Tahap 4, gap G-01..07.

### Diubah
- Pembagian pekerjaan per anggota kelompok tidak dipakai lagi (DEC-01). Dokumen Tahap 1–4 **tidak diubah isinya**; pemetaan ulang ada di DECISIONS §2.
- `README.md`: indeks dokumen diperbarui.

### Diverifikasi (lingkungan pengembangan lokal)
- 61/61 tes otomatis prototipe lulus.
- Rekonsiliasi REK-1..4 = 0 selisih di dua database lokal; kemampuan deteksi dibuktikan dengan injeksi kesalahan (ROLLBACK).
- 29/29 diagram Mermaid berhasil dirender dengan mermaid-cli.

### Tidak dilakukan
- Tidak ada perubahan kode aplikasi.
- Tidak ada migration ke database produksi.
- Tidak ada deployment.

## 10–11 November 2026 — sebelumnya
- Tahap 1 v0.1, Tahap 2 v0.1, Tahap 3 v0.2, Tahap 4 v0.6 + audit idempotency (branch `docs/tahap-1-4-scm`).
- Prototipe MVP dan `docs/implementasi` (branch `feat/mvp-aplikasi`).
