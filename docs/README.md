# Dokumentasi Modul SCM — SaaS Toko Asri

Folder ini berisi dokumen analisis dan perancangan modul **Supply Chain Management (SCM)** untuk proyek SaaS Toko Asri (ERP · SCM · CRM).

- Penanggung jawab SCM: Naurah
- Modul terkait: ERP (Kayla), CRM (Rei)

> **Status: semua dokumen di folder ini masih DRAF dan BELUM DISETUJUI** oleh tim maupun mitra. Isinya bisa berubah setelah review bersama. Jangan dijadikan acuan implementasi sebelum disetujui.

## Daftar dokumen

| Tahap | Dokumen | Versi | Tanggal | Status |
| --- | --- | --- | --- | --- |
| 1 | [Analisis Kebutuhan SCM](tahap-1-analisis-kebutuhan/tahap-1-analisis-kebutuhan-scm-v0.1-draf.md) | 0.1 | 10 Nov 2026 | Draf, belum disetujui |
| 2 | [Proses Bisnis As-Is dan To-Be](tahap-2-proses-bisnis/tahap-2-proses-bisnis-as-is-to-be-v0.1-draf.md) | 0.1 | 10 Nov 2026 | Draf, belum disetujui |
| 3 | [Perancangan Fitur SCM](tahap-3-perancangan-fitur/tahap-3-perancangan-fitur-scm-v0.2-draf.md) | 0.2 | 10 Nov 2026 | Draf revisi, menunggu persetujuan |
| 4 | [Kajian Awal Integrasi ERP–SCM–CRM](tahap-4-integrasi/tahap-4-kajian-awal-integrasi-v0.6-draf.md) | 0.6 | 10 Nov 2026 | Draf revisi untuk review; bagian 4.1–4.11 belum dikerjakan |
| 4 (lampiran) | [Audit dan Pengujian Idempotency](tahap-4-integrasi/audit-idempotency-tahap-4-v0.6.md) | untuk Tahap 4 v0.6 | 10 Nov 2026 | Laporan uji prototipe, bagian dari draf Tahap 4 |

Tahap 5–9 (database, API, antarmuka, implementasi, pengujian) **belum dimulai**. Stack teknologi dan kerangka proyek menunggu kesepakatan bersama Kayla dan Rei.

## Struktur folder

```
docs/
├── README.md
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
- **Penanda isi:** dokumen membedakan fakta wawancara ([F] / FAKTA), asumsi sementara, rekomendasi analis, dan hal yang perlu dikonfirmasi atau disepakati tim.
