# Tahap 1 — Analisis Kebutuhan Modul SCM Toko Asri

> **Catatan repositori — status dokumen:** Draf, **belum disetujui** tim (Naurah, Kayla, Rei) maupun mitra. Versi 0.1 (versi pertama; dokumen asli tidak bernomor versi). Isi di bawah tidak diubah dari draf asli.

10 November 2026

## Ringkasan

Masalah inti SCM Toko Asri adalah **pencatatan stok manual oleh banyak orang tanpa satu sumber data bersama**, bukan tingginya barang kedaluwarsa. MVP yang paling layak: Purchase Request → persetujuan admin pusat → Purchase Order → penerimaan barang per batch dan tanggal kedaluwarsa → stock movement yang memperbarui stok ERP, ditambah transfer antarcabang.

Dokumen ini memakai tiga penanda agar fakta tidak tercampur dengan rancangan:

- **[F]** Fakta dari wawancara, dengan kode sumber W1–W16.
- **[A]** Asumsi desain sementara. Wajib divalidasi ke mitra atau tim.
- **[R]** Rekomendasi pengembangan dari analis.

| Kode | Fakta wawancara (ringkas) |
| --- | --- |
| W1 | Barang masuk dari supplier dan dari toko cabang lain, disimpan di toko, lalu dijual |
| W2 | Stok dan tanggal kedaluwarsa dicatat manual di buku |
| W3 | Pemeriksaan stok seminggu sekali, dilaporkan ke admin |
| W4 | Barang kedaluwarsa/rusak jarang terjadi; barang tertentu wajib diperiksa rutin |
| W5 | Barang slow moving dilaporkan ke admin, bisa dipindah ke toko lain yang penjualannya lebih baik |
| W6 | Pembelian barang dilakukan melalui supplier |
| W7 | Keputusan membeli kembali ada di admin, bukan toko |
| W8 | Kehabisan stok pernah terjadi |
| W9 | Toko melaporkan stok habis ke admin setiap hari |
| W10 | Barang datang sekitar 1–3 hari setelah admin memesan |
| W11 | Admin memantau stok lewat aplikasi stok umum, bukan aplikasi khusus |
| W12 | Toko belum punya website sendiri |
| W13 | Pembeli didominasi mahasiswa dan reseller |
| W14 | Pembukuan dan pencatatan stok masih banyak manual |
| W15 | Selisih stok harus dilaporkan ke kantor sebelum data diperbarui |
| W16 | Masalah paling dirasakan: pencatatan stok melibatkan banyak orang sehingga rawan salah |

## A. Identifikasi Masalah SCM

Ada sembilan masalah yang didukung wawancara; tiga yang paling berat adalah P1, P2, dan P5. Dampak di kolom ketiga adalah analisis, bukan data kerugian dari mitra.

| ID | Masalah | Dasar | Dampak (analisis) | Area SCM |
| --- | --- | --- | --- | --- |
| P1 | Stok dan tanggal kedaluwarsa dicatat manual di buku | [F] W2, W14 | Sulit menelusuri stok per batch dan per cabang; data tidak bisa dihitung otomatis | Pencatatan stok, kedaluwarsa |
| P2 | Pencatatan melibatkan banyak orang sehingga rawan salah | [F] W16 (masalah utama) | Tidak jelas siapa mencatat apa; selisih sulit dilacak penyebabnya | Pencatatan stok, audit |
| P3 | Data terpecah: buku di toko, aplikasi stok umum di admin | [F] W2, W11 | Data dicatat dua kali dan perlu dicocokkan manual | Integrasi data |
| P4 | Pemeriksaan stok hanya seminggu sekali | [F] W3 | Selisih bisa baru terlihat sampai 7 hari setelah terjadi | Akurasi stok |
| P5 | Toko melapor saat stok **sudah habis**, lalu barang datang 1–3 hari kemudian | [F] W8, W9, W10 | Ada jeda kosong 1–3 hari pada produk itu; inilah mekanisme kehabisan stok yang paling mungkin | Pengadaan |
| P6 | Keputusan beli terpusat di admin, tetapi informasinya berupa laporan manual dari toko | [F] W7, W9 | Admin memutuskan tanpa data laju jual dan stok yang sedang dipesan | Pengadaan |
| P7 | Barang slow moving dilaporkan manual lalu dipindah antarcabang | [F] W1, W5 | Pemindahan tergantung inisiatif pelapor; jejak transfer belum jelas tercatat [A] | Transfer, slow moving |
| P8 | Selisih stok harus disetujui kantor sebelum data diubah | [F] W15 | Kontrol ini benar, tetapi jika manual, data stok tertunda dan mudah tertinggal | Penyesuaian stok |
| P9 | Pemantauan kedaluwarsa bergantung pada pemeriksaan rutin oleh orang | [F] W4 | Saat ini efektif, tetapi bergantung orang dan tidak berbasis batch | Kedaluwarsa |

Yang **bukan** masalah menurut wawancara: barang kedaluwarsa dan rusak jarang terjadi (W4), dan toko sudah memakai aplikasi stok umum (W11). Karena itu fitur kedaluwarsa diposisikan sebagai **pencegahan dan digitalisasi kontrol yang sudah berjalan**, bukan solusi atas kerugian.

## B. Analisis Akar Masalah (5 Whys)

Ketiga rantai bermuara pada akar yang sama: **transaksi stok tidak dicatat di satu sistem pada saat kejadian, per cabang dan per batch.** Level 1–2 bersumber dari wawancara; level 3–5 adalah hipotesis analis yang perlu dikonfirmasi.

**Rantai 1 — Data stok rawan salah (P1, P2, P3)**

1. Mengapa data stok rawan salah? Karena dicatat oleh banyak orang di buku. [F] W2, W16
2. Mengapa dicatat banyak orang? Karena penerimaan, pemeriksaan, dan pelaporan dilakukan oleh orang yang berbeda. [A]
3. Mengapa catatan mereka tidak menyatu? Karena buku di toko terpisah dari aplikasi stok umum milik admin. [F] W11, [A] untuk keterpisahannya
4. Mengapa terpisah? Karena tidak ada sistem yang mencatat transaksi langsung di titik kejadian (saat barang diterima, dipindah, atau disesuaikan). [A]
5. Mengapa belum ada? Karena Toko Asri belum punya sistem khusus yang menghubungkan toko, cabang, dan admin. [F] W11, W12

**Rantai 2 — Kehabisan stok (P5, P6)**

1. Mengapa kehabisan stok terjadi? Karena pembelian ulang baru diputuskan setelah toko melapor stok habis. [F] W7, W8, W9
2. Mengapa baru setelah habis? Karena laporan harian toko berisi stok habis, bukan stok menipis. [F] W9, perlu konfirmasi apakah stok menipis juga dilaporkan
3. Mengapa tidak ada sinyal stok menipis? Karena belum ada stok minimum atau titik pemesanan ulang per produk per cabang. [A]
4. Mengapa belum ada? Karena stok tidak tersedia secara real-time; kondisi aktual baru diketahui saat cek mingguan. [F] W3, [A]
5. Mengapa tidak real-time? Karena pencatatan masih manual. [F] W14

**Rantai 3 — Risiko barang tertahan di cabang yang lambat menjual (P7, P9)**

1. Mengapa barang bisa tertahan sampai mendekati kedaluwarsa? Karena laju jual berbeda antarcabang. [F] W5
2. Mengapa pemindahannya bergantung laporan? Karena slow moving diketahui dari pengamatan lalu dilaporkan ke admin. [F] W5
3. Mengapa admin tidak melihatnya langsung? Karena tidak ada data penjualan dan umur stok per cabang yang terhubung. [A]
4. Mengapa umur stok tidak diketahui? Karena stok tidak dicatat per batch dengan tanggal masuk dan kedaluwarsa dalam sistem. [F] W2
5. Mengapa tidak per batch? Karena buku manual tidak praktis untuk pelacakan batch. [A]

| Akar masalah | Arah solusi SCM |
| --- | --- |
| Tidak ada satu sumber data stok bersama | Stok dicatat sekali di database bersama ERP; SCM tidak membuat tabel stok sendiri |
| Perubahan stok tidak tercatat di titik kejadian | Setiap perubahan stok wajib lewat dokumen (penerimaan, transfer, penyesuaian) dan menghasilkan stock movement |
| Tidak ada sinyal sebelum stok habis | Stok minimum per produk per cabang + rekomendasi pengadaan yang memperhitungkan lead time 1–3 hari |
| Tidak ada visibilitas per batch lintas cabang | Product batch dengan tanggal kedaluwarsa, monitoring kedaluwarsa, dan slow moving per cabang |
| Tidak jelas siapa mencatat apa | Login per pengguna, peran, dan audit log |

## C–D. Aktor Sistem dan Kebutuhan Pengguna

Sistem punya tiga aktor manusia untuk MVP dan dua aktor sistem; supplier tidak diberi akses di MVP karena tidak ada dasar wawancara bahwa supplier memakai sistem digital.

| Aktor | Peran | Kewenangan SCM | Dasar |
| --- | --- | --- | --- |
| Admin pusat | Pengambil keputusan pengadaan dan pemindahan stok | Menyetujui/menolak PR, membuat PO, menyetujui transfer, mengatur parameter (stok minimum, slow moving, ambang kedaluwarsa), melihat semua cabang | [F] W5, W7, W9, W11 |
| Admin toko/cabang | Pelapor kebutuhan dan kondisi stok cabang | Membuat PR, mengajukan transfer, mengajukan penyesuaian selisih stok, melihat data cabangnya saja | [F] W3, W5, W9 |
| Petugas penerimaan/gudang | Pencatat barang datang dan barang keluar transfer | Mencatat penerimaan barang (batch, kedaluwarsa, rusak), mengirim dan menerima transfer | [A] Tidak disebut di wawancara; kemungkinan dirangkap staf toko |
| Kantor | Penyetuju selisih stok | Menyetujui penyesuaian stok sebelum data diubah | [F] W15; [A] apakah sama dengan admin pusat |
| Supplier (eksternal) | Pemasok barang | Tidak ada akses di MVP | [F] W6; akses = Won't Have |
| ERP (sistem) | Pemilik data produk, cabang, stok, penjualan | Menyediakan master data, menerima stock movement dan data PO | Instruksi proyek |
| CRM (sistem) | Pemilik data pelanggan dan permintaan | Membaca ketersediaan, mengirim sinyal permintaan lewat API | Instruksi proyek |

[R] Satu pengguna boleh punya lebih dari satu peran. Di toko kecil, admin cabang dan petugas penerimaan kemungkinan orang yang sama, jadi peran dirancang sebagai hak akses, bukan jabatan.

| Aktor | Kebutuhan utama | Masalah yang dijawab |
| --- | --- | --- |
| Admin pusat | Melihat stok semua cabang, stok yang sedang dipesan, dan laju jual dalam satu layar sebelum memutuskan beli | P3, P5, P6 |
| Admin pusat | Menerima pengajuan barang dari cabang dalam format seragam, lalu menyetujui dengan satu klik | P6 |
| Admin pusat | Mengetahui produk slow moving dan cabang mana yang lebih laku | P7 |
| Admin cabang | Mengajukan kebutuhan barang sebelum habis, dan tahu status pengajuannya | P5 |
| Admin cabang | Melihat batch mana yang harus dijual atau dipindah lebih dulu | P9 |
| Admin cabang | Mengajukan koreksi stok hasil cek mingguan tanpa mengubah data secara langsung | P4, P8 |
| Petugas penerimaan | Mencatat barang datang dengan cepat: jumlah, batch, kedaluwarsa, barang rusak | P1, P2 |
| Kantor | Melihat dan menyetujui selisih stok beserta bukti dan siapa yang mengajukan | P2, P8 |
| Semua | Tahu siapa yang mencatat dan mengubah data | P2 |

## E. User Stories

Ada 19 user story; kriteria penerimaan di kolom terakhir menjadi dasar test case Tahap 9.

| ID | User story | Dasar | Kriteria penerimaan |
| --- | --- | --- | --- |
| US-01 | Sebagai admin pusat, saya ingin menambah, mengubah, dan menonaktifkan supplier agar data pemasok terpusat | [F] W6 | Supplier tersimpan dengan nama dan kontak; supplier yang punya riwayat PO hanya bisa dinonaktifkan |
| US-02 | Sebagai admin pusat, saya ingin melihat produk yang dipasok tiap supplier dan riwayat PO-nya agar mudah memilih supplier | [R] | Halaman detail supplier menampilkan daftar produk dan PO terakhir |
| US-03 | Sebagai admin cabang, saya ingin mengajukan PR berisi produk, jumlah, dan alasan agar kebutuhan cabang tercatat resmi | [F] W7, W9 | PR minimal satu item, jumlah > 0, alasan wajib; status awal Diajukan |
| US-04 | Sebagai admin cabang, saya ingin melihat status PR saya agar tidak perlu menanyakan manual | [R] | Status berubah sesuai keputusan admin pusat dan tampil beserta catatannya |
| US-05 | Sebagai admin pusat, saya ingin menyetujui, menolak, atau mengubah jumlah PR dengan catatan agar keputusan beli tetap di tangan saya | [F] W7 | Hanya peran admin pusat yang bisa; penolakan wajib alasan; tercatat di audit log |
| US-06 | Sebagai admin pusat, saya ingin membuat PO dari PR yang disetujui dengan supplier, harga, dan estimasi kedatangan agar pemesanan terdokumentasi | [F] W6, W10 | PO hanya dari item PR berstatus Disetujui; estimasi kedatangan terisi otomatis dari lead time supplier |
| US-07 | Sebagai admin pusat, saya ingin melihat PO yang melewati estimasi kedatangan agar bisa menindaklanjuti supplier | [R] dari W10 | PO terlambat ditandai di dashboard |
| US-08 | Sebagai petugas penerimaan, saya ingin mencatat barang datang berdasarkan PO, lengkap dengan batch, kedaluwarsa, dan barang rusak, agar stok tercatat akurat sejak awal | [F] W2, W4 | Jumlah diterima + rusak ≤ sisa PO; tanggal kedaluwarsa wajib untuk produk ber-ED |
| US-09 | Sebagai petugas penerimaan, saya ingin menerima barang sebagian agar kedatangan bertahap tetap tercatat | [R] | Status PO menjadi Diterima Sebagian; sisa qty tetap terbuka |
| US-10 | Sebagai admin cabang, saya ingin stok bertambah otomatis setelah penerimaan dikonfirmasi agar tidak perlu mencatat ulang | [F] W14, W16 | Stok cabang di ERP bertambah sebesar qty baik; ada stock movement per batch |
| US-11 | Sebagai admin cabang, saya ingin mengajukan transfer stok ke cabang lain agar barang slow moving bisa dijual di tempat yang lebih laku | [F] W1, W5 | Pengajuan berisi cabang asal, tujuan, item, qty, alasan; qty ≤ stok tersedia |
| US-12 | Sebagai admin pusat, saya ingin menyetujui transfer agar perpindahan stok terkendali | [F] W5, W7 | Hanya admin pusat; stok belum berubah saat disetujui |
| US-13 | Sebagai petugas cabang asal dan tujuan, saya ingin mengonfirmasi pengiriman dan penerimaan transfer agar stok kedua cabang berubah di saat yang benar | [R] | Stok asal berkurang saat dikirim; stok tujuan bertambah saat diterima; selisih dicatat |
| US-14 | Sebagai admin pusat, saya ingin melihat produk slow moving per cabang berdasarkan parameter yang saya atur | [F] W5 | Parameter bisa diubah; daftar menampilkan saran cabang tujuan |
| US-15 | Sebagai admin cabang, saya ingin melihat batch yang mendekati kedaluwarsa dan urutan FEFO agar barang dijual sesuai urutan | [F] W2, W4 | Daftar diurutkan dari kedaluwarsa terdekat; ambang hari bisa diatur |
| US-16 | Sebagai admin pusat, saya ingin rekomendasi jumlah pembelian agar saya memesan sebelum stok habis | [F] W7, W8, W10 | Rekomendasi menampilkan dasar hitungan; tidak pernah membuat PO otomatis |
| US-17 | Sebagai admin cabang, saya ingin mengajukan koreksi selisih stok hasil cek mingguan agar kantor bisa menyetujuinya sebelum data berubah | [F] W3, W15 | Stok tidak berubah sebelum disetujui; tercatat siapa mengajukan dan menyetujui |
| US-18 | Sebagai admin pusat, saya ingin melihat riwayat aktivitas rantai pasok agar tahu siapa melakukan apa dan kapan | [F] W16 | Riwayat bisa difilter per cabang, pengguna, jenis dokumen, tanggal |
| US-19 | Sebagai admin pusat, saya ingin mendapat notifikasi stok di bawah minimum dari semua cabang agar laporan stok habis harian tidak lagi manual | [F] W9 | Notifikasi muncul di aplikasi saat stok ≤ minimum |

## F. Functional Requirements

Kebutuhan fungsional dikelompokkan per fitur; kode fitur dipakai lagi di Tahap 3, 5, 6, dan 9.

| ID | Kebutuhan fungsional | Dasar |  |
| --- | --- | --- | --- |
| FR-SUP-01 | Sistem menyediakan tambah, ubah, lihat, dan nonaktifkan supplier (nama, kontak, alamat, lead time default) | [F] W6 |  |
| FR-SUP-02 | Sistem memetakan supplier ke produk yang dipasok, dengan harga beli terakhir | [R] |  |
| FR-SUP-03 | Sistem menampilkan riwayat PO per supplier | [R] |  |
| FR-SUP-04 | Sistem menghitung performa supplier dari data penerimaan: ketepatan waktu, kesesuaian jumlah, persentase rusak | [R] |  |
| FR-PR-01 | Admin cabang dapat membuat PR multi-item dengan jumlah dan alasan | [F] W7, W9 |  |
| FR-PR-02 | PR memiliki status: Draf, Diajukan, Disetujui, Disetujui Sebagian, Ditolak, Dibatalkan, Selesai | [R] |  |
| FR-PR-03 | Admin pusat dapat menyetujui, menolak, atau mengubah jumlah per item dengan catatan | [F] W7 |  |
| FR-PR-04 | PR dapat dibuat dari daftar rekomendasi pengadaan | [R] |  |
| FR-PO-01 | Admin pusat membuat PO untuk satu supplier dari satu atau lebih item PR yang disetujui | [F] W6, W7 |  |
| FR-PO-02 | PO mencatat cabang tujuan, harga beli per item, dan estimasi kedatangan (default: tanggal PO + lead time supplier) | [F] W10 |  |
| FR-PO-03 | PO memiliki status: Draf, Dipesan, Diterima Sebagian, Diterima Lengkap, Dibatalkan, Ditutup | [R] |  |
| FR-PO-04 | Sistem menandai PO yang melewati estimasi kedatangan | [R] |  |
| FR-GR-01 | Petugas mencatat penerimaan berdasarkan PO: jumlah diterima dan jumlah rusak/ditolak per item | [F] W1, W4 |  |
| FR-GR-02 | Setiap item diterima dicatat dengan nomor batch, tanggal kedaluwarsa, dan tanggal produksi (opsional) | [F] W2 |  |
| FR-GR-03 | Sistem mendukung penerimaan sebagian dan bertahap untuk satu PO | [R] |  |
| FR-GR-04 | Konfirmasi penerimaan membuat batch, stock movement masuk, dan menambah stok cabang dalam satu transaksi | [F] W14, W16 |  |
| FR-TR-01 | Admin cabang mengajukan transfer: cabang asal, cabang tujuan, item, jumlah, alasan | [F] W1, W5 |  |
| FR-TR-02 | Admin pusat menyetujui atau menolak transfer | [F] W5, W7 |  |
| FR-TR-03 | Pengiriman transfer mengurangi stok cabang asal per batch (default FEFO) dan mengubah status menjadi Dalam Perjalanan | [R] |  |
| FR-TR-04 | Penerimaan transfer menambah stok cabang tujuan per batch; selisih kirim–terima dicatat | [R] |  |
| FR-SM-01 | Admin pusat mengatur parameter slow moving: periode analisis (hari), batas laju jual, batas umur stok | [F] W5 |  |
| FR-SM-02 | Sistem menampilkan produk slow moving per cabang dan saran cabang tujuan dengan laju jual lebih tinggi | [F] W5 |  |
| FR-SM-03 | Pengguna dapat membuat pengajuan transfer langsung dari daftar slow moving | [R] |  |
| FR-ED-01 | Sistem menampilkan batch per cabang berdasarkan sisa hari ke kedaluwarsa, dengan ambang yang bisa diatur | [F] W2, W4 |  |
| FR-ED-02 | Sistem menampilkan urutan FEFO per produk per cabang | [R] |  |
| FR-ED-03 | Barang kedaluwarsa atau rusak dikeluarkan dari stok lewat pengajuan yang disetujui, dan tercatat di riwayat | [F] W4, W15 |  |
| FR-RP-01 | Sistem menghitung rekomendasi pengadaan per produk per cabang (rumus di bawah) | [F] W7, W8, W10 |  |
| FR-RP-02 | Rekomendasi menampilkan komponen hitungan dan dapat diubah sebelum dijadikan PR/PO | [F] W7 |  |
| FR-ADJ-01 | Admin cabang mengajukan penyesuaian stok hasil pemeriksaan; stok berubah hanya setelah disetujui kantor | [F] W3, W15 |  |
| FR-NOT-01 | Notifikasi di aplikasi untuk: PR baru, PR diputuskan, PO terlambat, stok ≤ minimum, batch mendekati kedaluwarsa, transfer menunggu tindakan | [F] W9; [R] |  |
| FR-AUD-01 | Setiap aksi penting tercatat di audit log: pengguna, waktu, aksi, dokumen, nilai sebelum dan sesudah | [F] W16 |  |
| FR-AUD-02 | Halaman riwayat aktivitas SCM dengan filter cabang, pengguna, jenis dokumen, dan tanggal | [F] W16 |  |
| FR-INT-01 | SCM membaca produk, cabang, stok, dan penjualan dari ERP; tidak membuat salinan master data | Instruksi proyek |  |
| FR-INT-02 | SCM menulis perubahan stok hanya lewat stock movement yang disepakati dengan ERP | Instruksi proyek |  |
| FR-INT-03 | CRM membaca ketersediaan produk dan mengirim data permintaan pelanggan lewat API, bukan akses database langsung | Instruksi proyek |  |

Rumus awal rekomendasi pengadaan [R], semua parameter dapat diatur admin pusat:

```latex
\text{Rekomendasi} = \max\Big(0,\; \bar{d} \times (L + T) + S_{min} - (S_{tersedia} + Q_{PO\,berjalan} + Q_{transfer\,masuk})\Big)
```

Keterangan: d̄ = rata-rata penjualan harian produk di cabang itu (dari ERP); L = lead time supplier, default 3 hari sebagai batas atas wawancara W10 [A]; T = jeda sampai keputusan beli berikutnya, default 1 hari karena laporan harian W9 [A]; S_min = stok minimum. Sistem memberi rekomendasi bila stok tersedia ≤ d̄ × L + S_min.

## G. Non-Functional Requirements

Target angka di bawah adalah [R] untuk skala tugas akhir dan diuji dengan data dummy, bukan janji kinerja produksi.

| ID | Kategori | Kebutuhan | Ukuran / cara uji |
| --- | --- | --- | --- |
| NFR-01 | Konsistensi data | Setiap perubahan stok berjalan dalam satu transaksi database; gagal sebagian = dibatalkan seluruhnya | Simulasi error di tengah penerimaan: stok dan movement tidak berubah |
| NFR-02 | Integritas stok | Stok tidak boleh negatif per produk, cabang, dan batch | Constraint database + validasi API |
| NFR-03 | Jejak audit | Stock movement dan audit log hanya bisa ditambah, tidak bisa diubah atau dihapus | Tidak ada endpoint ubah/hapus; koreksi lewat movement pembalik |
| NFR-04 | Keamanan autentikasi | Password disimpan dengan hash (bcrypt/argon2); sesi atau token kedaluwarsa | Cek isi tabel users tidak memuat plaintext |
| NFR-05 | Otorisasi | Hak akses berbasis peran, dicek di backend untuk setiap endpoint | Pengguna cabang yang memanggil endpoint approve mendapat 403 |
| NFR-06 | Isolasi cabang | Pengguna cabang hanya melihat dan mengubah data cabangnya | Request ke data cabang lain mendapat 403/404 |
| NFR-07 | Validasi input | Semua input divalidasi di backend (tipe, wajib, jumlah > 0, tanggal kedaluwarsa > tanggal terima) | Request tidak valid mendapat 422 dengan pesan per kolom |
| NFR-08 | Kerahasiaan konfigurasi | API key dan kredensial database disimpan di environment variable, tidak di repositori | Pemeriksaan repositori |
| NFR-09 | Kegunaan | Antarmuka berbahasa Indonesia, format tanggal DD/MM/YYYY, zona waktu WIB, istilah konsisten | Uji pengguna dengan 1–2 staf mitra jika memungkinkan |
| NFR-10 | Responsif | Form penerimaan dan transfer dapat dipakai di layar ponsel (lebar 360 px) | [A] petugas toko mencatat dari ponsel; validasi ke mitra |
| NFR-11 | Kinerja | Halaman daftar memuat ≤ 2 detik untuk sekitar 10.000 baris movement dummy, dengan paginasi | Uji lokal |
| NFR-12 | Interoperabilitas | API REST berformat JSON dengan prefiks versi (/api/v1) dan format error seragam | Review kontrak API Tahap 6 |
| NFR-13 | Retensi data | Data historis tidak dihapus fisik; master data memakai status aktif/nonaktif | Tidak ada DELETE fisik pada tabel transaksi |
| NFR-14 | Pemeliharaan | Kode modular per fitur, mengikuti stack dan struktur folder proyek kelompok | Review kode |
| NFR-15 | Pemisahan data | Data dummy dipisah dari data produksi (seed terpisah atau database terpisah) | Konfigurasi environment |

## H. Business Rules

Aturan terpenting adalah BR-01 dan BR-05: keputusan beli hanya oleh admin pusat, dan stok hanya berubah lewat dokumen yang sah.

| ID | Aturan | Dasar |
| --- | --- | --- |
| BR-01 | Hanya admin pusat yang dapat menyetujui PR, membuat PO, dan menyetujui transfer | [F] W7 |
| BR-02 | Cabang tidak dapat memesan langsung ke supplier | [F] W6, W7 |
| BR-03 | Rekomendasi pengadaan tidak pernah membuat PR atau PO secara otomatis | Batasan proyek, [F] W7 |
| BR-04 | Setiap item PO harus merujuk item PR yang disetujui | [A] perlu konfirmasi apakah admin juga memesan tanpa permintaan cabang |
| BR-05 | Stok hanya berubah lewat penerimaan barang, transfer, penyesuaian yang disetujui, pengeluaran kedaluwarsa/rusak, atau penjualan dari ERP; setiap perubahan menghasilkan satu stock movement | [F] W15, W16 |
| BR-06 | Stock movement tidak dapat diubah atau dihapus; kesalahan dikoreksi dengan movement pembalik | [R] |
| BR-07 | Selisih stok hasil pemeriksaan tidak langsung mengubah stok; wajib disetujui kantor | [F] W15 |
| BR-08 | Produk yang memiliki tanggal kedaluwarsa wajib dicatat dengan nomor batch dan tanggal kedaluwarsa saat diterima | [F] W2 |
| BR-09 | Jumlah diterima + jumlah rusak tidak boleh melebihi sisa jumlah PO | [R] |
| BR-10 | Stok cabang asal berkurang saat transfer dikirim, bukan saat diajukan atau disetujui; stok cabang tujuan bertambah saat diterima | [R] |
| BR-11 | Pengeluaran stok untuk transfer mengikuti FEFO; pengecualian wajib alasan | [R] |
| BR-12 | Batch yang sudah kedaluwarsa tidak dapat ditransfer | [R] |
| BR-13 | Selisih antara jumlah dikirim dan diterima pada transfer dicatat dan diselesaikan oleh admin pusat | [R] |
| BR-14 | Supplier yang memiliki riwayat PO hanya dapat dinonaktifkan, tidak dihapus | [R] |
| BR-15 | Parameter stok minimum, slow moving, dan ambang kedaluwarsa diatur oleh admin pusat; setiap perubahan tercatat | [F] W5, W7 |
| BR-16 | Estimasi kedatangan default = tanggal PO + lead time supplier; jika belum diisi, default 3 hari | [F] W10, [A] untuk default |
| BR-17 | Pengguna cabang hanya dapat mengakses data cabangnya sendiri | Batasan proyek |
| BR-18 | Stok tidak boleh negatif pada level produk, cabang, dan batch | [R] |

## I. Prioritas Fitur (MoSCoW)

Must Have berisi alur yang langsung menjawab masalah utama W16 dan kehabisan stok W8; fitur yang bergantung pada data penjualan digital ditaruh di Should Have.

| Fitur | Prioritas | Alasan |
| --- | --- | --- |
| Login, peran, dan isolasi data cabang | Must | Dasar kontrol kewenangan W7 dan jejak pencatat W16 |
| Supplier (tambah, ubah, nonaktif, produk yang dipasok) | Must | Prasyarat PO; W6 |
| Purchase Request + persetujuan admin pusat | Must | Menggantikan laporan stok habis harian W9 dengan dokumen resmi; menjaga kewenangan W7 |
| Purchase Order + status + estimasi kedatangan | Must | Admin bisa melihat pesanan berjalan; W6, W10 |
| Penerimaan barang per batch + kedaluwarsa + barang rusak + penerimaan sebagian | Must | Titik pencatatan stok pertama; W2, W16 |
| Stock movement + pembaruan stok ERP | Must | Satu sumber data stok; W14, W16 |
| Transfer stok antarcabang (ajukan, setujui, kirim, terima) | Must | Alur nyata W1 dan solusi slow moving W5; tanpa ini stok multi-cabang tidak konsisten |
| Monitoring kedaluwarsa + urutan FEFO | Must | Murah dibuat setelah batch tersedia; mendigitalkan kontrol W4 |
| Audit log + riwayat aktivitas | Must | Menjawab langsung W16 |
| Notifikasi di aplikasi: stok ≤ minimum, PR/transfer menunggu | Must | Mengganti laporan manual W9 |
| Rekomendasi pengadaan versi dasar (stok ≤ minimum, memperhitungkan PO berjalan) | Must | Mencegah stok habis W8 tanpa butuh data penjualan lengkap |
| Rekomendasi pengadaan dengan laju jual dan lead time (rumus F) | Should | Butuh data penjualan harian dari ERP |
| Monitoring slow moving + saran cabang tujuan | Should | Butuh data penjualan per cabang; W5 |
| Penyesuaian stok hasil pemeriksaan + persetujuan kantor | Should | Kuat dasarnya (W3, W15) tetapi bisa jadi milik modul ERP; lihat evaluasi |
| Pengeluaran barang kedaluwarsa/rusak | Should | Kasusnya jarang menurut W4 |
| Integrasi CRM: ketersediaan produk | Should | Kebutuhan integrasi proyek; tidak mengubah alur SCM inti |
| Evaluasi performa supplier | Could | Dihitung dari data penerimaan, tetapi tidak disebut mitra |
| Integrasi CRM: sinyal permintaan pelanggan ke SCM | Could | Bergantung kesiapan CRM mencatat permintaan |
| Scan barcode saat penerimaan | Could | Mempercepat input, tetapi belum diketahui apakah produk berbarcode |
| Portal supplier | Won't (MVP) | Tidak ada dasar wawancara bahwa supplier memakai sistem digital |
| PO otomatis tanpa persetujuan | Won't | Bertentangan dengan W7 dan batasan proyek |
| Forecasting berbasis machine learning | Won't (MVP) | Data historis belum ada; rumus sederhana cukup |
| Notifikasi email/WhatsApp | Won't (MVP) | Notifikasi di aplikasi cukup untuk MVP |
| Pencatatan hutang dan pembayaran supplier | Won't (SCM) | Domain keuangan ERP; SCM hanya mengirim harga beli |
| Retur barang ke supplier | Won't (MVP) | Tidak disebut mitra; barang rusak cukup dicatat saat penerimaan |

## Evaluasi Kritis dan Kesiapan Tahap 2

Rancangan **siap lanjut ke Tahap 2 (proses bisnis)**, tetapi belum siap untuk Tahap 5 (database) sebelum tiga keputusan dengan tim ERP disepakati.

### Temuan kritis

1. **Masalah nomor satu mitra justru tidak ada di daftar fitur awal.** W3, W15, dan W16 menunjuk ke pencatatan dan koreksi stok, tetapi master prompt tidak memuat fitur stock opname/penyesuaian. Siapa pemilik fitur stock opname, ERP atau SCM, harus diputuskan bersama tim.
2. **Slow moving dan rekomendasi pengadaan bergantung pada data penjualan digital per cabang.** Jika modul ERP belum mencatat penjualan per transaksi, kedua fitur ini tidak punya data. Karena itu versi dasar rekomendasi (stok ≤ minimum) dijadikan Must, versi laju jual dijadikan Should.
3. **Stok harus dicatat per batch, termasuk saat penjualan.** Jika ERP mengurangi stok hanya per produk, data kedaluwarsa per batch akan salah setelah barang terjual. Perlu disepakati: ERP mengurangi stok per batch dengan aturan FEFO, atau SCM menyediakan fungsi alokasi FEFO yang dipanggil ERP.
4. **Istilah "admin", "kantor", dan "admin toko" belum jelas.** Jika kantor berbeda dari admin pusat, alur persetujuan selisih stok butuh peran tambahan.
5. **Aplikasi stok umum yang sudah dipakai tidak bisa diabaikan.** Tanpa rencana migrasi atau pemakaian berdampingan, staf bisa mencatat dua kali dan masalah W16 justru memburuk.
6. **Jaga skala MVP.** Satu level persetujuan sudah cukup; persetujuan bertingkat, portal supplier, dan forecasting akan memperlambat implementasi tanpa dasar kebutuhan.

### Asumsi yang belum tervalidasi

| ID | Asumsi | Dampak jika salah | Validasi ke |
| --- | --- | --- | --- |
| A1 | Supplier mengirim langsung ke toko/cabang, bukan ke gudang pusat | Alur PO dan penerimaan berubah; perlu gudang pusat sebagai lokasi | Mitra |
| A2 | Petugas penerimaan adalah staf toko, bukan peran terpisah | Jumlah peran dan hak akses | Mitra |
| A3 | "Kantor" pada W15 sama dengan admin pusat | Perlu peran penyetuju tambahan | Mitra |
| A4 | Semua produk frozen food memiliki tanggal kedaluwarsa dan nomor batch dari supplier | Jika tidak ada nomor batch, sistem harus membuat batch internal per tanggal terima | Mitra |
| A5 | Satu PO untuk satu supplier dan satu cabang tujuan | Struktur tabel PO | Mitra |
| A6 | Admin pusat selalu memesan berdasarkan permintaan cabang | Jika admin juga memesan inisiatif sendiri, PO tanpa PR harus diizinkan (BR-04) | Mitra |
| A7 | ERP mencatat penjualan per transaksi, per cabang, per produk | Slow moving dan rekomendasi lanjut tidak bisa dihitung | Tim ERP |
| A8 | ERP memiliki tabel produk, cabang, stok, dan users yang dipakai bersama | Risiko duplikasi master data | Tim ERP |
| A9 | Lead time default 3 hari dan periode tinjau 1 hari | Rekomendasi terlalu besar atau kecil | Mitra |
| A10 | Transfer antarcabang dikirim oleh staf toko, bukan jasa kurir | Perlu data pengirim atau tidak | Mitra |
| A11 | Staf mencatat dari ponsel | Prioritas desain mobile | Mitra |

### Pertanyaan validasi untuk mitra

1. Berapa jumlah cabang saat ini, dan apakah ada gudang pusat?
2. Apakah supplier mengirim langsung ke tiap toko, atau ke satu lokasi lalu dibagi?
3. Siapa yang dimaksud "admin" dan "kantor"? Apakah orang yang sama?
4. Siapa yang menerima dan mengecek barang datang di toko?
5. Apakah setiap produk punya nomor batch dan tanggal kedaluwarsa di kemasan? Apakah ada barcode?
6. Saat melapor ke admin, apakah toko juga melaporkan stok yang hampir habis, atau hanya yang sudah habis?
7. Bagaimana admin memutuskan jumlah yang dipesan? Apakah ada stok minimum per produk?
8. Apakah admin pernah memesan tanpa permintaan dari toko?
9. Bagaimana menentukan suatu barang disebut slow moving? Berapa lama barang dianggap terlalu lama tersimpan?
10. Barang apa saja yang wajib diperiksa rutin (W4), dan berapa hari sebelum kedaluwarsa dianggap perlu tindakan?
11. Apa nama aplikasi stok umum yang dipakai admin? Apakah datanya bisa diekspor (Excel/CSV)?
12. Bagaimana transfer antarcabang dicatat dan dikirim saat ini?
13. Apa yang terjadi jika barang datang tidak sesuai jumlah atau rusak? Dikembalikan ke supplier atau dicatat saja?
14. Apakah satu supplier memasok banyak produk, dan apakah satu produk bisa dipasok banyak supplier?

### Pertanyaan untuk tim kelompok (ERP dan CRM)

1. Stack teknologi apa yang dipakai (frontend, backend, database)?
2. Apakah ERP sudah punya tabel products, branches, users, dan stok? Bisa dibagikan skemanya?
3. Apakah stok ERP dicatat per batch atau hanya per produk per cabang?
4. Apakah penjualan dicatat per transaksi di ERP?
5. Modul mana yang memiliki fitur stock opname/penyesuaian stok?
6. Bagaimana autentikasi bersama dibuat (satu tabel users, satu login)?
7. Data apa yang dibutuhkan CRM dari SCM, dan apakah CRM mencatat permintaan produk dari pelanggan?

### MVP SCM yang direkomendasikan

- Login, peran (admin pusat, admin cabang, petugas penerimaan), dan isolasi data cabang.
- Supplier dan produk yang dipasok.
- Purchase Request dengan persetujuan admin pusat.
- Purchase Order dengan status dan estimasi kedatangan.
- Penerimaan barang per batch, kedaluwarsa, barang rusak, dan penerimaan sebagian.
- Stock movement yang memperbarui stok ERP.
- Transfer stok antarcabang empat langkah.
- Monitoring kedaluwarsa dan urutan FEFO.
- Rekomendasi pengadaan dasar dan notifikasi di aplikasi.
- Audit log dan riwayat aktivitas.

### Rekomendasi langkah berikutnya

1. Lanjutkan ke Tahap 2 sekarang. Proses As-Is bisa digambar dari wawancara; titik yang bergantung pada asumsi A1–A6 ditandai di diagram.
2. Kirim pertanyaan mitra nomor 1–8 lebih dulu, karena jawabannya mengubah alur To-Be.
3. Bawa pertanyaan tim nomor 2–5 ke rapat kelompok sebelum Tahap 5, karena menentukan struktur tabel stok dan batch.
