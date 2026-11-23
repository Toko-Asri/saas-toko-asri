# Dokumentasi SaaS Toko Asri (ERP · SCM · CRM)

Folder ini berisi dokumen analisis dan perancangan SaaS Toko Asri. ERP, SCM, dan CRM dirancang sebagai **satu aplikasi** yang dikerjakan Naurah (DEC-01). Pembagian modul per anggota kelompok di dokumen Tahap 1–4 bersifat historis; pemetaan ulangnya ada di [DECISIONS.md](DECISIONS.md) §2.

> **Status: semua dokumen di folder ini masih DRAF dan BELUM DISETUJUI** oleh Naurah maupun mitra. Isinya bisa berubah setelah review.

## Dokumen fundamental (acuan implementasi setelah disetujui)

| No | Dokumen | Isi | Versi | Status |
| --- | --- | --- | --- | --- |
| 1 | [PRD](01-product/PRD.md) | Kebutuhan produk, role, FR/NFR, ruang lingkup MVP | 1.0-draf | Belum disetujui |
| 2 | [ARCHITECTURE](02-architecture/ARCHITECTURE.md) | Arsitektur, modul, ownership data, integrasi, diagram | 1.0-draf | Belum disetujui |
| 3 | [DESIGN](03-design/DESIGN.md) | Design system, IA, screen inventory, wireframe, user flow | 1.0-draf | Belum disetujui |
| 4 | [SCHEMA](04-database/SCHEMA.md) | Konvensi, ERD, spesifikasi tabel, integritas, rencana migration | 1.0-draf | Belum disetujui |
| 5 | [RULES](05-rules/RULES.md) | Aturan bisnis & persediaan, otorisasi, validasi, status, error | 1.0-draf | Belum disetujui |
| — | [TRACEABILITY_MATRIX](06-review/TRACEABILITY_MATRIX.md) | Audit silang PRD → Architecture → Design → Schema → Rules | 1.0-draf | Audit mandiri |
| — | [DECISIONS](DECISIONS.md) | Keputusan, status persetujuan, gap prototipe | 1.0-draf | Menunggu persetujuan |
| — | [CHANGELOG](CHANGELOG.md) | Riwayat perubahan dokumentasi | — | — |

## Dokumen tahap (analisis awal)

| Tahap | Dokumen | Versi | Tanggal | Status |
| --- | --- | --- | --- | --- |
| 1 | [Analisis Kebutuhan SCM](tahap-1-analisis-kebutuhan/tahap-1-analisis-kebutuhan-scm-v0.1-draf.md) | 0.1 | 10 Nov 2026 | Draf, belum disetujui |
| 2 | [Proses Bisnis As-Is dan To-Be](tahap-2-proses-bisnis/tahap-2-proses-bisnis-as-is-to-be-v0.1-draf.md) | 0.1 | 10 Nov 2026 | Draf, belum disetujui |
| 3 | [Perancangan Fitur SCM](tahap-3-perancangan-fitur/tahap-3-perancangan-fitur-scm-v0.2-draf.md) | 0.2 | 10 Nov 2026 | Draf revisi, menunggu persetujuan |
| 4 | [Kajian Awal Integrasi ERP–SCM–CRM](tahap-4-integrasi/tahap-4-kajian-awal-integrasi-v0.6-draf.md) | 0.6 | 10 Nov 2026 | Draf revisi untuk review; bagian 4.1–4.11 belum dikerjakan |
| 4 (lampiran) | [Audit dan Pengujian Idempotency](tahap-4-integrasi/audit-idempotency-tahap-4-v0.6.md) | untuk Tahap 4 v0.6 | 10 Nov 2026 | Laporan uji prototipe, bagian dari draf Tahap 4 |

Prototipe aplikasi (belum siap produksi) ada di branch `feat/mvp-aplikasi`. Stack teknologi berstatus usulan (DEC-02).

## Struktur folder

```
docs/
├── README.md
├── DECISIONS.md
├── CHANGELOG.md
├── 01-product/PRD.md
├── 02-architecture/ARCHITECTURE.md
├── 03-design/DESIGN.md
├── 04-database/SCHEMA.md
├── 05-rules/RULES.md
├── 06-review/TRACEABILITY_MATRIX.md
├── tahap-1-analisis-kebutuhan/
│   └── tahap-1-analisis-kebutuhan-scm-v0.1-draf.md
├── tahap-2-proses-bisnis/
│   ├── tahap-2-proses-bisnis-as-is-to-be-v0.1-draf.md
│   └── gambar/gambaran-besar-to-be.png
├── tahap-3-perancangan-fitur/
│   └── tahap-3-perancangan-fitur-scm-v0.2-draf.md
└── tahap-4-integrasi/
    ├── tahap-4-kajian-awal-integrasi-v0.6-draf.md
    ├── audit-idempotency-tahap-4-v0.6.md
    ├── gambar/
    │   ├── diagram-5-3-penerimaan.png
    │   └── diagram-6-3-arsitektur.png
    └── lampiran-uji-idempotency/   (SQL uji, bukan skema produksi)
```

## Catatan

- **Penamaan file:** `tahap-<n>-<topik>-v<versi>[-draf].md`. Akhiran `-draf` dihapus setelah dokumen disetujui, dan versi dinaikkan bila ada revisi.
- **Versi Tahap 1 dan 2:** dokumen aslinya tidak bernomor versi, jadi di repositori diberi v0.1. Isinya tidak diubah; hanya ditambah satu baris catatan status di bagian atas.
- **Diagram:** diagram Mermaid ditulis langsung di Markdown dan tampil di GitHub. Diagram gambaran besar Tahap 2 aslinya interaktif, jadi disimpan sebagai gambar PNG.
- **Tautan claude.ai** di dalam dokumen bersifat privat dan hanya bisa dibuka pemiliknya. Gunakan tautan antardokumen di tabel di atas.
- **Penanda isi:** dokumen membedakan fakta wawancara ([F] / FAKTA), asumsi sementara, rekomendasi analis, dan hal yang perlu dikonfirmasi. Dokumen fundamental memakai penanda [F], [F-P], [K], [A], [R], [U] (lihat PRD).
