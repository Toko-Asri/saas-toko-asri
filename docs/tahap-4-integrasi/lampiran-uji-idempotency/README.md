# Lampiran Uji Idempotency (Tahap 4 v0.6)

> **Peringatan:** file SQL di folder ini adalah **skema uji minimal** untuk membuktikan perilaku idempotency yang dijelaskan di Tahap 4 bagian 6.2.1. Ini **bukan** skema produksi dan **bukan** rancangan database Tahap 5.

Laporan lengkapnya ada di [audit-idempotency-tahap-4-v0.6.md](../audit-idempotency-tahap-4-v0.6.md).

## Isi

| File | Keterangan |
| --- | --- |
| `skema-v2.sql` | Skema uji hasil perbaikan audit |
| `data-uji.sql` | Data uji |
| `verifikasi.sql` | Query verifikasi hasil uji |
| `jalankan-v2.sh` | Skrip menjalankan uji v2 |
| `hasil-uji-v2.txt` | Keluaran uji v2 di PostgreSQL 16.15 |
| `v1-diaudit/` | Versi pertama yang diaudit, disimpan sebagai jejak audit |

## Tentang `v1-diaudit/`

**Versi 1 cacat dan tidak boleh dipakai.** Audit menemukan antara lain: jenis selain MASUK diperlakukan sebagai KELUAR, jumlah nol atau negatif diterima, sidik isi bisa bertabrakan dan bergantung pada pengaturan DateStyle, serta gagal di isolasi REPEATABLE READ. Semua sudah diperbaiki di v2. File v1 disimpan hanya supaya temuan audit bisa ditelusuri.
