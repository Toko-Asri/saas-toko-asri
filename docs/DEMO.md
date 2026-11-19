# Skrip demo Toko Asri (10–12 menit)

Tujuan: memperlihatkan bahwa **ERP, SCM, dan CRM saling terhubung** dalam satu alur:
penjualan mengurangi stok per batch → stok menipis memunculkan saran pembelian ke pemasok → transaksi memperbarui data pelanggan.

## Persiapan (sebelum presentasi)

1. Pastikan semua migration sudah dijalankan di proyek Supabase **demo** (daftar lengkap di README) dan akun tiga peran sudah dibuat.
2. **Jalankan `supabase/seed.sql` tepat sebelum demo.** Tanggal kedaluwarsa dan riwayat penjualan dibuat relatif terhadap hari seed dijalankan; jumlah hari di skrip ini ("hampir kedaluwarsa 7 hari", "100 hari tidak belanja") berlaku pada hari seed dijalankan dan bergeser seiring waktu. Seed ulang juga mengembalikan data ke keadaan awal skrip ini.
3. Siapkan tiga jendela/profil browser yang sudah login: **pemilik**, **kasir**, dan **staf gudang** (atau login bergantian).
4. Jalankan aplikasi (`npm run dev` atau hasil build) dan buka Beranda pemilik dengan periode **7 hari**.

Nama produk, pelanggan, dan angka di bawah ini berasal dari `supabase/seed.sql` dan sudah dicocokkan dengan data seed.

---

## 1. Dashboard pemilik: gambaran toko (1–2 menit) · login: pemilik

Buka **Beranda**.

- **Perlu tindakan** menampilkan: 3 produk di bawah stok minimum (*Nugget Ayam 500 g*, *Es Krim Vanilla 1 L*, *Salmon Fillet 300 g*), 2 batch sudah kedaluwarsa (*Sosis Sapi 500 g*, *Bakso Sapi 500 g*), 3 batch hampir kedaluwarsa (*Dumpling Ayam 250 g*, *Bakso Ikan 500 g*, *Ikan Dori Fillet 500 g*), 1 pesanan pembelian menunggu barang (CV Laut Segar Abadi), dan 3 pelanggan Silver yang perlu dihubungi.
- Kartu **penjualan, laba kotor, transaksi**, serta perbandingan dengan periode sebelumnya; grafik harian; panel stok, pelanggan, produk terlaba.
- Gulir ke bawah: **Aktivitas terbaru lintas modul** dan **Integritas data** (ketujuh pemeriksaan bertanda ✓).

> Sampaikan: seluruh angka dihitung di database dan sama persis dengan Laporan Keuangan.

## 2. Kasir menjual ke pelanggan (2 menit) · login: kasir

1. **Mulai transaksi**.
2. Di kotak *Pelanggan*, ketik **Eka** → pilih **Eka Putri** (Reguler, 48 poin).
3. Tambahkan **Nugget Ayam 500 g × 1** (Rp36.000) dan **Mochi Es Krim 200 g × 1** (Rp32.000). Total **Rp68.000**, tampil perkiraan **+6 poin**.
4. Pilih **Tunai**, ketik **70000** pada kolom *Uang diterima* → kembalian **Rp2.000** → **Bayar**.

**Hasil di struk:** pelanggan *Eka Putri* kini **Silver** (total belanja Rp551.000, melewati batas Rp500.000), **+6 poin**, total poin **54**.

> Sampaikan: harga dan HPP dibaca server saat transaksi; tombol Bayar aman dari klik ganda; transaksi, stok, dan poin tersimpan dalam satu transaksi database.

## 3. Dampak lintas modul terlihat di dashboard (1–2 menit) · pemilik

Muat ulang **Beranda** pemilik.

- **Aktivitas terbaru** memuat *Penjualan #… Rp68.000 · Eka Putri · +6 poin* dan *Saran pembelian: Mochi Es Krim 200 g*.
- **Perlu tindakan**: saran pembelian bertambah dari 3 menjadi **4**. *Mochi Es Krim 200 g* memiliki stok 16 dengan minimum 15; satu penjualan membuatnya tepat **15 = minimum**, sehingga sistem otomatis menyarankan pemesanan ulang (**ERP → SCM**).
- Buka **Pelanggan → Eka Putri**: tier **Silver**, 54 poin, bilah kemajuan menuju Gold (**Rp1.449.000** lagi), riwayat belanja memuat transaksi tadi (**ERP → CRM**).

## 4. Stok per batch, FEFO (1 menit) · kasir lalu staf gudang

1. Kasir: jual **Dumpling Ayam 250 g × 2** sebagai tamu (tanpa pelanggan).
2. Staf gudang: **Inventori**. Batch **DMP-2410A** (kedaluwarsa lebih dekat) berkurang dari 10 menjadi **8**, sedangkan **DMP-2411A** tetap **30**.

> Sampaikan: stok selalu diambil dari batch yang paling dulu kedaluwarsa; batch kedaluwarsa tidak pernah terjual.

## 5. Dari saran ke barang diterima (2–3 menit) · login: staf gudang

1. **Saran Pembelian** → baris **Mochi Es Krim 200 g** (disarankan pesan **30**, pemasok *PT Dingin Manis Sejahtera*) → **Buat PO**.
2. Di halaman PO: **Tandai sudah dipesan**.
3. Isi penerimaan: jumlah **30**, kode batch **MOC-2412A**, lokasi **Freezer B**, tanggal kedaluwarsa kira-kira 3 bulan ke depan → **Catat penerimaan barang**.
4. **Hasil:** PO berstatus *Diterima*, stok Mochi menjadi **45**, saran Mochi hilang dari daftar (**SCM → stok**).
5. (Opsional) Terima juga PO *CV Laut Segar Abadi* (Ikan Dori Fillet 40, Udang Kupas 20).

## 6. Penyesuaian stok dan kerugian (1 menit) · staf gudang

**Penyesuaian Stok** → baris merah (kedaluwarsa): **Buang semua** untuk **SSG-2409A** (Sosis Sapi, 6) dan **BKS-2410A** (Bakso Sapi, 8). Riwayat di bawah mencatat alasan, perubahan jumlah, dan nilai kerugian (Rp432.000).

## 7. Segmentasi pelanggan (1 menit) · pemilik

**Segmentasi Pelanggan** (menu pemilik): matriks tier × aktivitas dan bagian **Perlu dihubungi**: **Putra Mahendra** (Silver, berisiko), **Rina Marlina** dan **Satria Utama** (Silver, tidak aktif). Tekan **WhatsApp** untuk pesan siap kirim berisi sisa poin.

## 8. Laporan keuangan dan integritas (1 menit) · pemilik

- **Laporan Keuangan** (periode Hari ini): penjualan Rp68.000 + Rp50.000 (Dumpling), HPP, laba kotor, **kerugian stok Rp432.000**, produk terlaba.
- Kembali ke **Beranda**: kartu *Kerugian stok* sama dengan laporan; **Integritas data** tetap ✓ semua, bukti bahwa poin, stok, penjualan, dan PO tetap konsisten setelah seluruh alur di atas.

---

## Penutup (poin untuk dosen)

- **ERP**: kasir FEFO, HPP per batch, laporan laba kotor, penyesuaian stok.
- **SCM**: saran pembelian otomatis, PO, penerimaan barang per batch dengan tanggal kedaluwarsa.
- **CRM**: pelanggan, poin (1 poin per Rp10.000), tier (Silver ≥ Rp500.000, Gold ≥ Rp2.000.000), segmentasi.
- **Integrasi**: tiga titik terhubung secara atomik di database; dashboard dan pemeriksa integritas menunjukkan data konsisten.
- Keamanan: tiga peran dengan RLS; kasir tidak melihat laba/HPP; staf gudang tidak melihat penjualan atau pelanggan.
