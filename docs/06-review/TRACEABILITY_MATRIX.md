# Traceability Matrix & Audit Silang
## SaaS Toko Asri — PRD → Architecture → Design → Schema → Rules

| | |
| --- | --- |
| Versi | 1.0-draf · 12 November 2026 |
| Status | Hasil audit mandiri oleh penyusun dokumen. **Bukan** persetujuan; review Naurah tetap diperlukan. |
| Cara dibuat | Kolom layar dibaca otomatis dari tabel Screen Inventory di DESIGN. Pemeriksaan ID (§6.3) dijalankan dengan skrip yang membaca kelima dokumen. Pemetaan komponen, tabel, dan aturan disusun manual, lalu diperiksa skrip: setiap tabel harus ada di SCHEMA §4.3, setiap ID aturan harus terdefinisi di RULES. |

---

## 6.1 Matriks FR (MVP)

Keterangan kolom:

| Kolom | Isi |
| --- | --- |
| Komponen | Modul atau pintu layanan dari ARCHITECTURE §2.2–2.4 |
| Layar | ID SCR dari DESIGN §3.4 |
| Tabel | Spesifikasi di SCHEMA §4.3 |
| Aturan | ID di RULES |
| Prototipe | Status di branch `feat/mvp-aplikasi`. "Ada" = fitur sudah dibangun dan tercakup tes otomatis; ini **bukan** jaminan siap produksi |

Kode ST-xx menunjuk diagram status di RULES §5.6:

| Kode | Diagram |
| --- | --- |
| ST-PR | Purchase Request |
| ST-PO | Purchase Order |
| ST-RCV | Penerimaan |
| ST-TRF | Transfer |
| ST-ORD | Pesanan |
| ST-PROC | Pemrosesan stok |

| FR | Fitur | Komponen (ARCHITECTURE) | Layar (DESIGN) | Tabel (SCHEMA) | Aturan (RULES) | Prototipe |
| --- | --- | --- | --- | --- | --- | --- |
| FR-COR-01 | Login dan sesi | core.auth · `/login`, sesi, CSRF | SCR-01 | core.pengguna | VAL (username), ERR BELUM_LOGIN, CSRF, §5.4 | Ada |
| FR-COR-02 | Manajemen pengguna dan role | core.pengguna · `/api/v1/core/pengguna` (rencana) | SCR-07 | core.pengguna | §5.4 (Super Admin), VAL (username, password) | Gap G-01, G-03 |
| FR-COR-03 | Dashboard per role | core dashboard per role | SCR-02 | baca: erp.v_*, scm.*, crm.pesanan | §5.4 | Ada |
| FR-COR-04 | Notifikasi dalam aplikasi | core.layanan.kirim_notifikasi | SCR-03 | core.notifikasi | INT-11 | Ada |
| FR-COR-05 | Log integrasi stok | core.log_integrasi (koneksi terpisah) | SCR-06 | core.log_integrasi | INT-06..09, §5.6 lapis 3 | Ada |
| FR-COR-06 | Rekonsiliasi data stok | ERP rekonsiliasi · `/api/v1/erp/rekonsiliasi` (rencana) | SCR-08 | erp.saldo_batch, erp.stock_movement, scm.pengajuan_stok, scm.po_baris, scm.gr_baris, scm.transfer_kirim | INV-09 | Gap G-05 (kueri sudah diuji) |
| FR-ERP-01 | Master produk | ERP master | SCR-19, SCR-20 | erp.produk | BR-INV-01, VAL (SKU, harga) | Ada |
| FR-ERP-02 | Master cabang | ERP master | SCR-21, SCR-22 | erp.cabang | VAL (kode) | Ada |
| FR-ERP-03 | Manajemen persediaan | ERP persediaan · erp.v_stok_produk | SCR-10 | erp.saldo_batch | BR-INV-01..03, BR-INV-05 | Ada |
| FR-ERP-04 | Batch dan tanggal kedaluwarsa | ERP batch | SCR-10 | erp.batch | INV-04, INV-08 | Ada |
| FR-ERP-05 | Layanan stok dan stock movement | erp.ajukan_kejadian_stok | SCR-11 | erp.stock_movement, erp.kunci_kejadian, erp.saldo_batch | INV-01, INV-02, INT-01..04 | Ada |
| FR-ERP-06 | Penjualan | erp.layanan.buat_penjualan | SCR-12, SCR-13, SCR-14 | erp.penjualan, erp.penjualan_baris, erp.penjualan_alokasi | BR-SAL-01..06, INV-05 | Ada |
| FR-ERP-07 | Penyesuaian stok | ERP penyesuaian | SCR-15, SCR-16, SCR-17 | erp.penyesuaian, erp.penyesuaian_baris | BR-APR-05, INV-03, INV-06..08 | Ada |
| FR-ERP-08 | Laporan persediaan dan transaksi | ERP laporan · erp.v_penjualan_harian | SCR-18 | baca: erp.* | §5.4 | Ada |
| FR-ERP-09 | Saldo awal | ERP saldo awal · `/api/v1/erp/saldo-awal` (rencana) | SCR-23 | erp.saldo_batch, erp.stock_movement (kunci SALDO-AWAL-*) | BR-INV-04, INV-01 | Gap G-04 |
| FR-SCM-01 | Manajemen supplier | SCM pengadaan | SCR-31, SCR-32 | scm.supplier | VAL (telepon, lead time) | Ada |
| FR-SCM-02 | Hubungan supplier–produk | SCM pengadaan | SCR-33 | scm.supplier_produk | BR-PO-03 | Ada |
| FR-SCM-03 | Purchase Request (PR) | SCM pengadaan | SCR-34, SCR-35, SCR-36 | scm.pr, scm.pr_baris | BR-PUR-01..06, ST-PR | Ada |
| FR-SCM-04 | Persetujuan PR | SCM pengadaan | SCR-36 | scm.pr | BR-APR-01..03, BR-APR-06, ST-PR | Ada |
| FR-SCM-05 | Purchase Order (PO) | SCM pengadaan | SCR-37, SCR-38, SCR-39 | scm.po, scm.po_baris | BR-PO-01..08, ST-PO | Ada |
| FR-SCM-06 | Penerimaan barang | SCM penerimaan → erp.ajukan_kejadian_stok | SCR-40, SCR-41, SCR-42 | scm.gr, scm.gr_baris, scm.pengajuan_stok | BR-RCV-01..07, INT-05..08, ST-RCV, ST-PROC | Ada |
| FR-SCM-07 | Pencatatan batch | SCM penerimaan → ERP batch | SCR-41 | scm.gr_baris, erp.batch | INV-04 | Ada |
| FR-SCM-08 | Transfer stok antarcabang | SCM transfer → erp.ajukan_kejadian_stok | SCR-43, SCR-44, SCR-45 | scm.transfer, scm.transfer_baris, scm.transfer_kirim, scm.transfer_penerimaan | BR-TRF-01..10, BR-APR-04, INT-05..08, ST-TRF | Ada |
| FR-SCM-09 | Slow-moving monitoring | SCM monitoring | SCR-47 | scm.tinjauan_slow_moving, scm.parameter | INV-10 | Ada |
| FR-SCM-10 | Expiry monitoring | SCM monitoring | SCR-46 | scm.status_kedaluwarsa, scm.parameter | INV-08 | Ada |
| FR-SCM-11 | FEFO | SCM monitoring + ERP alokasi FEFO | SCR-14, SCR-45, SCR-46 | erp.penjualan_alokasi, scm.transfer_kirim | INV-05, BR-TRF-04, BR-SAL-01 | Ada |
| FR-SCM-12 | Rekomendasi pengadaan — versi dasar | SCM monitoring | SCR-48 | scm.parameter_stok, scm.status_rekomendasi | INV-11 | Ada |
| FR-SCM-13 | Rekomendasi pengadaan — versi laju jual | SCM monitoring | SCR-48 | scm.parameter, baca erp.v_penjualan_harian | INV-11 | Ada |
| FR-SCM-14 | Activity log | core.layanan.catat_aktivitas | SCR-04, SCR-05 | core.audit_log | ERR-05 | Ada |
| FR-SCM-15 | Parameter pemantauan dan pengadaan | SCM parameter | SCR-49, SCR-50 | scm.parameter, scm.parameter_stok | VAL (parameter) | Ada |
| FR-CRM-01 | Manajemen pelanggan | CRM layanan | SCR-63, SCR-64 | crm.pelanggan | BR-CUS-01, BR-CUS-02 | Ada |
| FR-CRM-02 | Member | CRM layanan | SCR-65 | crm.member | BR-CUS-03 | Ada |
| FR-CRM-03 | Riwayat pembelian | CRM layanan · baca erp.v_penjualan | SCR-65 | crm.pesanan | BR-CUS-08 | Ada |
| FR-CRM-04 | Pesanan | CRM → erp.layanan.buat_penjualan | SCR-60, SCR-61, SCR-62 | crm.pesanan, crm.pesanan_baris | BR-CUS-04..07, ST-ORD | Ada |
| FR-CRM-05 | Status pesanan | CRM layanan | SCR-60, SCR-62 | crm.pesanan | ST-ORD | Ada |
| FR-CRM-06 | Ketersediaan stok dari ERP | CRM · baca erp.v_stok_produk | SCR-66 | baca: erp.v_stok_produk | BR-INV-03 | Ada |

Layar lintas fitur: SCR-30 Ringkasan SCM (semua FR-SCM monitoring) dan SCR-09 halaman error.

Tabel lintas fitur: `core.nomor_dokumen` (penomoran semua dokumen) tidak terikat satu FR.

## 6.2 Matriks NFR

| NFR | Arsitektur | Design | Schema | Rules | Bukti / status |
| --- | --- | --- | --- | --- | --- |
| NFR-SEC-01..05 (auth, RBAC, isolasi cabang, CSRF, hash password) | core.auth, §2.4 error handling | Menu per role (§3.3), halaman 403 | `core.pengguna` | §5.4, ERR `DILARANG`/`CSRF` | Tes `test_rbac_per_peran`, `test_isolasi_cabang`, `test_logout_dan_csrf`, `test_password_disimpan_sebagai_hash`. Rate limit login belum ada (G-07) |
| NFR-PRF-01..02 | Index, satu proses | Halaman dirender server, paginasi | §4.6 indexing | — | **Belum diukur** (tidak ada uji beban) |
| NFR-AVL-01..02 | Deployment (usulan), backup | Halaman 503 | §4.6 rollback | ERR `DATABASE` | Backup–restore **belum diuji** |
| NFR-SCL-01 | Modular monolith, skema per modul | — | §4.1 skema per modul | INT-10 | Desain; belum diuji skala |
| NFR-USA-01..02 | — | §3.1–3.2, state standar, Bahasa Indonesia | — | ERR-01 | Tes e2e `test_e2e_validasi_form_dan_loading`, `test_e2e_tampilan_hp_menu_dan_tabel`. Belum ada uji pengguna dengan mitra |
| NFR-MNT-01..02 | Modul + pintu publik, migration bernomor | Design system | §4.1, §4.6 | — | `test_migration_idempoten_dan_menolak_perubahan_file`, `test_scm_dan_crm_tidak_menulis_tabel_erp` |
| NFR-INT-01..02 | Layanan stok, idempotency, 3 lapis status | Status pemrosesan terpisah | §4.5 | INT-01..11, ERR-02..04, §5.6 | 19 tes idempotency/integrasi; rekonsiliasi 0 selisih + injeksi |
| NFR-RSP-01 | — | Breakpoint 1100/860/640 | — | — | `test_e2e_tampilan_hp_menu_dan_tabel` |
| NFR-AUD-01..02 | activity log, log integrasi | SCR-04/05/06 | `core.audit_log`, `core.log_integrasi` (append-only) | ERR-05, ERR-06 | `test_stock_movement_dan_audit_log_append_only` |

---

## 6.3 Hasil 10 Pemeriksaan

| No | Pemeriksaan | Metode | Hasil |
| --- | --- | --- | --- |
| 1 | Setiap FR MVP punya komponen arsitektur | Matriks §6.1 | **Lulus** — 36/36 |
| 2 | Setiap FR MVP punya layar di DESIGN | Skrip membaca kolom FR di Screen Inventory | **Lulus** — 36/36 |
| 3 | Setiap layar MVP punya wireframe | Skrip: 51 SCR vs tabel "Peta wireframe → halaman" | **Lulus** — 51/51 |
| 4 | Setiap FR punya tabel, dan setiap tabel yang dirujuk ada di SCHEMA | Skrip: rujukan tabel vs judul §4.3 | **Lulus** — 0 tabel tak dikenal. 37/38 tabel terikat ke FR; `core.nomor_dokumen` lintas fitur |
| 5 | Setiap FR punya aturan, dan setiap ID aturan yang dirujuk terdefinisi | Skrip: ID BR/INV/INT/ERR | **Lulus** — 0 ID hilang. 84 aturan; ERR-01..04/06 dan INT-10 bersifat lintas fitur (dipetakan ke NFR §6.2) |
| 6 | Rujukan FR, NFR, dan SCR di semua dokumen menunjuk ID yang ada | Skrip: ID di ARCH/DESIGN/SCHEMA/RULES vs definisi di PRD/DESIGN | **Lulus** — 0 rujukan patah |
| 7 | Status dokumen di diagram RULES = nilai CHECK di database | Skrip: nilai `CHECK (status …)` di SCHEMA vs nama state di §5.6, untuk 7 tabel berstatus | **Lulus** — tidak ada status yang hanya ada di satu sisi |
| 8 | Role & permission konsisten antara PRD §1.2, DESIGN §3.3, dan RULES §5.4 | Manual | **Lulus dengan catatan** — role prototipe masih `STAF_PENJUALAN` dan belum ada `SUPER_ADMIN` (G-01, G-02). Ketiga dokumen menandainya sebagai usulan (DEC-07) |
| 9 | Kepemilikan data: hanya ERP yang mengubah stok, konsisten di ARCH §2.3, SCHEMA §4.4, RULES INT-01 | Manual + tes statis prototipe | **Lulus** — ditegakkan lewat kode dan tes, **belum** lewat hak akses database (dicatat di SCHEMA §4.4) |
| 10 | Semua diagram Mermaid valid dan dapat dirender | `mmdc` (mermaid-cli) merender setiap blok ke SVG | **Lulus** — 29/29 (rincian §6.4). Satu diagram sequence sempat gagal karena tanda `;` di teks pesan, lalu diperbaiki |

### Temuan yang tidak menggagalkan pemeriksaan tetapi perlu ditindak

| ID | Temuan | Tindak lanjut |
| --- | --- | --- |
| T-01 | FR-COR-02 (manajemen pengguna), FR-COR-06 (rekonsiliasi), FR-ERP-09 (saldo awal) berstatus MVP tetapi belum ada di prototipe | Masuk rencana implementasi setelah dokumen disetujui (G-03, G-04, G-05) |
| T-02 | Keunikan batch (`UNIQUE produk, nomor, kedaluwarsa`) belum punya tes khusus | Tambah tes saat implementasi berikutnya |
| T-03 | Kinerja, backup–restore, dan rate limit login belum diuji/dibuat | Wajib sebelum pilot (NFR-PRF, NFR-AVL-02, G-07) |
| T-04 | Pemisahan hak database per modul belum ada | Rekomendasi pascapilot (DEC-03) |
| T-05 | Stepper transfer di DESIGN menampilkan "Selesai" untuk transfer berstatus `DITERIMA`, padahal di database itu dua status berbeda | Disengaja demi kesederhanaan tampilan; dicatat di RULES §5.6 |

---

## 6.4 Validasi Diagram

Seluruh blok ` ```mermaid ` diekstrak dari kelima dokumen lalu dirender dengan `mmdc` (mermaid-cli) ke SVG pada 12 November 2026. Sebuah diagram dinyatakan lulus bila SVG terbentuk dan tidak berisi "Syntax error" atau "Parse error".

| Dokumen | Diagram | Lulus |
| --- | --- | --- |
| PRD | 1 (flowchart proses bisnis) | 1 |
| ARCHITECTURE | 10 (context, container, component, dependency, deployment, 4 sequence, flowchart alur data) | 10 |
| DESIGN | 9 (IA + 8 user flow) | 9 |
| SCHEMA | 2 (ERD lengkap 38 tabel/77 relasi, ERD ringkas) | 2 |
| RULES | 7 (state diagram PR, PO, penerimaan, transfer, pesanan, penyesuaian, pemrosesan stok) | 7 |
| **Total** | **29** | **29** |

Wireframe di DESIGN berupa teks (ASCII), bukan Mermaid, sehingga tidak divalidasi dengan alat ini.

## 6.5 Verifikasi pendukung (dijalankan 12 November 2026)

| Verifikasi | Hasil |
| --- | --- |
| `pytest tests` pada branch `feat/mvp-aplikasi`, database uji lokal | 61 passed, 0 failed |
| Rekonsiliasi REK-1..4 di `toko_asri_dev` dan `toko_asri_test` | 0 selisih di keduanya |
| Injeksi kesalahan (di dalam transaksi, lalu ROLLBACK) | Setiap REK mendeteksi kesalahannya: REK-1 = 1, REK-2 = 1, REK-3 = 1, REK-4 = 1 |

Semua verifikasi di atas berjalan di **lingkungan pengembangan lokal**. Tidak ada yang dijalankan ke database produksi.
