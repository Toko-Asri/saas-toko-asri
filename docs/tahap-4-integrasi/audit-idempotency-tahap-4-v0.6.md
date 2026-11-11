# Audit dan Pengujian Idempotency — Stage 4 v0.6

> Proyek: SaaS Toko Asri · Modul: Integrasi ERP–SCM–CRM · Penanggung jawab SCM: Naurah
> Tanggal: 10 November 2026 · Objek audit: `skema.sql` (SQL prototipe yang dipakai untuk hasil pengujian di Stage 4 v0.6, bagian 6.2.1)
> Hasil perbaikan: `skema-v2.sql` · Status: **sudah dijalankan dan diuji** pada PostgreSQL 16.15

SQL di dokumen ini adalah **skema uji minimal**. Bukan rancangan database Tahap 5 dan bukan skema produksi. Tujuannya hanya membuktikan perilaku mekanisme idempotency yang dijelaskan di Stage 4.

Catatan sumber: lampiran prompt tidak memuat SQL terpisah. Yang diaudit adalah `skema.sql`, yaitu SQL yang dipakai untuk hasil "Hasil pengujian prototipe mekanisme" di Stage 4 v0.6.

---

## 1. Ringkasan Hasil Audit

| Hal | Hasil |
| --- | --- |
| Inti mekanisme concurrency di SQL awal (unique constraint + `INSERT … ON CONFLICT DO NOTHING` + savepoint) | **Benar.** Terbukti menunggu dengan benar dan melepas klaim saat ditolak |
| Validasi dan sidik isi di SQL awal | **Bermasalah.** 3 temuan kritis dan 3 tinggi, semuanya dibuktikan dengan eksekusi |
| SQL hasil perbaikan (`skema-v2.sql`) | Dijalankan pada PostgreSQL 16.15. **77 dari 77 pemeriksaan lulus**, diulang 5 kali dengan hasil sama |
| Skenario dua sesi | Dijalankan dengan dua koneksi psql sungguhan. Sesi B **terbukti menunggu** (`wait_event_type = Lock`, `transactionid`) sebelum sesi A di-commit atau di-rollback |
| Dampak ke Stage 4 v0.6 | Hasil uji concurrency di v0.6 tetap berlaku untuk mekanismenya, tetapi SQL yang dipakai saat itu punya celah validasi dan sidik isi. Bagian 6.2.1 perlu diperkuat (bagian 9) |

Hal yang **tidak** dibuktikan: kehilangan jawaban COMMIT yang sebenarnya di jaringan, kejadian multi-baris, MySQL, arsitektur layanan terpisah, dan beban banyak sesi. Rinciannya di bagian 2.3 dan 10.

---

## 2. Daftar Temuan dan Tingkat Risiko

Tingkat: **Kritis** = dapat menyebabkan stok ganda atau data tidak konsisten · **Tinggi** = mekanisme gagal atau hasil salah · **Sedang** = keandalan · **Rendah** = kualitas kode.

### 2.1 Temuan pada SQL awal (`skema.sql`)

| ID | Tingkat | Temuan | Bukti | Perbaikan di v2 |
| --- | --- | --- | --- | --- |
| A-01 | **Kritis** | Jenis kejadian tidak divalidasi. `CASE p_jenis WHEN 'MASUK' … ELSE -p_jumlah` membuat **semua** jenis selain `MASUK` diperlakukan sebagai barang keluar | Dieksekusi: jenis `'masuk'` (huruf kecil) pada batch bersaldo 10 → **BERHASIL dan saldo menjadi 5** | Hanya `MASUK`/`KELUAR` yang diterima; selain itu DITOLAK (TC-07) |
| A-02 | **Kritis** | Jumlah tidak divalidasi | Dieksekusi: `MASUK` jumlah −3 → **BERHASIL, saldo turun 3, movement −3**. Jumlah 0 → BERHASIL dengan movement 0 | Jumlah wajib > 0; `CHECK (perubahan <> 0)` (TC-06) |
| A-03 | **Kritis** | Sidik isi dibuat dari `concat_ws('\|', …)`. Karakter `\|` di dalam nilai membuat isi berbeda menghasilkan teks yang sama; `concat_ws` juga melewatkan NULL sehingga posisi nilai bergeser | Dieksekusi: produk `A\|B` batch `C`, lalu produk `A` batch `B\|C` dengan kunci sama → **I-2 SUDAH DIPROSES**, seharusnya I-3. SCM mengira isinya tercatat padahal ERP mencatat isi lain | Isi dibentuk sebagai `jsonb` (tanpa pemisah, NULL tetap null), lalu SHA-256 (TC-15) |
| A-04 | Tinggi | Mekanisme hanya benar pada isolasi READ COMMITTED, tanpa pengaman | Dieksekusi dua sesi: sesi B di REPEATABLE READ menunggu, lalu gagal **`could not serialize access due to concurrent update`**, bukan I-2 | Fungsi menolak tegas bila isolasi bukan READ COMMITTED (TC-13) |
| A-05 | Tinggi | Tanggal diubah ke teks memakai pengaturan `DateStyle` sesi, sehingga sidik isi sama bisa berbeda antarsesi | Dieksekusi: isi sama, sesi kedua `DateStyle='SQL, DMY'` → **I-3 KONFLIK palsu** | Tanggal di `jsonb` selalu ISO (TC-14) |
| A-06 | Tinggi | Tidak ada cara memastikan hasil tanpa mengirim ulang, padahal Stage 4 §5.2 mensyaratkan "hasil dipastikan melalui catatan kunci di ERP" | Analisis; fungsi baca tidak ada | Fungsi `status_kunci` (TC-12) |
| A-07 | Sedang | `KELUAR` dari batch yang tidak ada menyisipkan baris saldo 0, lalu ditolak dengan pesan "saldo tidak cukup" | Dieksekusi: pesan salah untuk batch `TIDAKADA` | Baris saldo hanya dibuat untuk `MASUK`; pesan "batch tidak ditemukan" (TC-05) |
| A-08 | Sedang | Kunci NULL menimbulkan error tak tertangani, bukan penolakan terkendali | Dieksekusi: `null value in column "kunci" … violates not-null constraint` | Kunci divalidasi lebih dulu (TC-07) |
| A-09 | Sedang | `WHEN check_violation` menangkap pelanggaran CHECK **apa pun** dan menyebutnya "saldo tidak cukup" | Analisis kode | Saldo diperiksa eksplisit; penolakan memakai kode error khusus `TA001`; CHECK tetap sebagai pertahanan terakhir dan tidak ditangkap |
| A-10 | Sedang | I-2 hanya mengembalikan teks, bukan hasil sebelumnya | Analisis; Stage 4 I-2 mensyaratkan hasil sebelumnya | Mengembalikan `movement_id` yang sama (TC-02) |
| A-11 | Sedang | Tidak ada batasan "satu movement per baris kunci" di database | Analisis kode | `UNIQUE (kunci, baris)` |
| A-12 | Sedang | Tidak ada batas waktu tunggu; standar PostgreSQL menunggu tanpa batas | Analisis | Pemanggil wajib memasang `lock_timeout`; diuji (TC-16) |
| A-13 | Sedang | Produk bisa dinonaktifkan di tengah pemrosesan | Analisis kode | `SELECT … FOR SHARE` pada produk |
| A-14 | Sedang | Uji v1 bergantung jeda waktu (`sleep`), bukan bukti bahwa sesi kedua benar-benar menunggu | Analisis skrip | Skrip v2 memeriksa `pg_stat_activity.wait_event_type = 'Lock'` sebelum A selesai |
| A-15 | Rendah | Parameter `p_tunda` (`pg_sleep`) ada di dalam fungsi pemroses | Analisis kode | Dihapus; tumpang tindih dibuat dengan transaksi terbuka di sesi A |
| A-16 | Rendah | Sidik memakai MD5 | Analisis | SHA-256 bawaan PostgreSQL |
| A-17 | Rendah | `search_path` fungsi tidak dikunci | Analisis | `SET search_path = uji_idem` di setiap fungsi |
| A-18 | Rendah | Isi kejadian tidak disimpan, hanya sidik, sehingga sulit diaudit | Analisis | Kolom `isi` (jsonb); verifikasi V7 dan V8 |

### 2.2 Bagian SQL awal yang terbukti benar

| Bagian | Bukti |
| --- | --- |
| `PRIMARY KEY` pada kunci + `INSERT … ON CONFLICT DO NOTHING` membuat pengajuan kedua **menunggu** transaksi pertama | Dua sesi: sesi B berstatus `Lock / transactionid` sampai sesi A commit |
| Setelah A commit, pengajuan kedua tidak memproses ulang | Sesi B mendapat I-2 (isi sama) atau I-3 (isi berbeda) |
| Penolakan bisnis di dalam blok `BEGIN … EXCEPTION` (savepoint) **langsung melepas klaim**, bahkan selama transaksi A masih terbuka | Dua sesi: sesi B tidak menunggu dan langsung BERHASIL (TC-10b) |
| `CHECK (jumlah >= 0)` dan `SELECT … FOR UPDATE` mencegah saldo negatif untuk dua kunci berbeda | Sesi B membaca saldo terbaru setelah A commit dan ditolak (TC-11) |

### 2.3 Keterbatasan yang masih ada di v2 (dijelaskan terbuka)

| ID | Keterbatasan | Dampak | Penanganan yang disarankan |
| --- | --- | --- | --- |
| L-01 | Satu pengajuan = satu baris barang | Kejadian multi-baris (satu GR berisi beberapa produk/batch) belum diuji. Dua kejadian multi-baris bisa saling menunggu (deadlock) bila urutan penguncian berbeda | Implementasi nyata wajib mengunci baris saldo dalam **urutan tetap** (misalnya cabang, produk, batch, kedaluwarsa) dan menguji deadlock |
| L-02 | Kehilangan jawaban COMMIT yang sebenarnya di jaringan tidak bisa direproduksi dengan andal | TC-12b hanya mensimulasikan klien yang tidak membaca jawaban | Logika pemulihannya sama (status kunci + kirim ulang), sudah diuji |
| L-03 | `status_kunci` hanya melihat data yang sudah commit | Saat pengajuan lain masih berjalan, hasilnya "belum ada yang berhasil" | Langkah aman tetap **kirim ulang isi sama**: pengajuan itu akan menunggu lalu mendapat I-2 atau I-1 |
| L-04 | Log penolakan dan kegagalan teknis (lapis 3 Stage 4 §5.2) tidak dibuat di SQL ini | Penolakan hanya terlihat di jawaban fungsi | Ditulis lapisan aplikasi di luar transaksi utama (AS-14) |
| L-05 | Hanya PostgreSQL 16.15, satu mesin, tanpa uji beban | Perilaku MySQL/database lain dan banyak sesi belum terbukti | Uji ulang di database pilihan tim (P-07) |
| L-06 | Jumlah sangat besar dapat menimbulkan error *integer out of range* | Error teknis, transaksi batal | Batas atas jumlah ditentukan Tahap 6 |

---

## 3. SQL Hasil Perbaikan Lengkap

File: `skema-v2.sql`.

```sql
-- =====================================================================
-- skema-v2.sql — Skema MINIMAL untuk menguji mekanisme idempotency
-- kejadian stok (Stage 4 v0.6, bagian 6.2.1).
--
-- BUKAN rancangan database Tahap 5 dan BUKAN skema produksi.
-- Satu pengajuan = satu baris barang (single-line). Lihat keterbatasan
-- di laporan audit.
--
-- Syarat menjalankan:
--   * PostgreSQL 13 atau lebih baru (diuji pada PostgreSQL 16.15)
--   * Fungsi ajukan_kejadian wajib dipanggil pada isolasi READ COMMITTED
--   * Pemanggil sebaiknya memasang batas tunggu, misalnya:
--       SET lock_timeout = '5s';   -- nilai final: keputusan P-07
-- =====================================================================

BEGIN;

DROP SCHEMA IF EXISTS uji_idem CASCADE;
CREATE SCHEMA uji_idem;
SET LOCAL search_path = uji_idem;

-- ---------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------

-- Pengganti minimal master produk ERP (hanya status aktif).
CREATE TABLE produk (
  id    text    PRIMARY KEY CHECK (btrim(id) <> ''),
  aktif boolean NOT NULL
);

-- Saldo per cabang, produk, batch, tanggal kedaluwarsa.
CREATE TABLE saldo_batch (
  cabang      text    NOT NULL CHECK (btrim(cabang) <> ''),
  produk      text    NOT NULL REFERENCES produk (id),
  batch       text    NOT NULL CHECK (btrim(batch) <> ''),
  kedaluwarsa date    NOT NULL,
  jumlah      integer NOT NULL,
  CONSTRAINT saldo_tidak_negatif CHECK (jumlah >= 0),          -- PK-9
  PRIMARY KEY (cabang, produk, batch, kedaluwarsa)
);

-- Catatan kunci: HANYA pengajuan yang Berhasil yang tersimpan di sini.
CREATE TABLE kunci_kejadian (
  kunci        text        PRIMARY KEY                         -- K-M1
               CHECK (btrim(kunci) <> '' AND length(kunci) <= 100),
  sidik_isi    text        NOT NULL CHECK (sidik_isi ~ '^[0-9a-f]{64}$'),
  isi          jsonb       NOT NULL,                           -- untuk audit
  dicatat_pada timestamptz NOT NULL DEFAULT now()
);

-- Riwayat perubahan saldo. Satu baris barang per kunci hanya boleh
-- punya satu stock movement.
CREATE TABLE stock_movement (
  id          bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kunci       text    NOT NULL REFERENCES kunci_kejadian (kunci),
  baris       integer NOT NULL CHECK (baris >= 1),
  cabang      text    NOT NULL,
  produk      text    NOT NULL,
  batch       text    NOT NULL,
  kedaluwarsa date    NOT NULL,
  perubahan   integer NOT NULL CHECK (perubahan <> 0),
  dicatat_pada timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT satu_movement_per_baris_kunci UNIQUE (kunci, baris),
  FOREIGN KEY (cabang, produk, batch, kedaluwarsa) REFERENCES saldo_batch
);

-- ---------------------------------------------------------------------
-- Isi kanonik dan sidik isi (K-M5)
--   * Dibentuk sebagai jsonb, sehingga tidak ada masalah karakter
--     pemisah dan nilai NULL tetap tercatat sebagai null.
--   * Tanggal di JSON selalu berformat ISO (tidak bergantung DateStyle).
--   * Nilai TIDAK dinormalisasi (tidak di-trim, tidak diubah huruf),
--     agar dua isi yang berbeda tidak pernah dianggap sama.
--   * Struktur memakai daftar "baris" agar siap untuk multi-baris.
-- ---------------------------------------------------------------------
CREATE FUNCTION isi_kanonik(p_jenis text, p_cabang text, p_produk text,
                            p_batch text, p_kedaluwarsa date, p_jumlah integer)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = uji_idem AS $$
  SELECT jsonb_build_object(
           'jenis',  p_jenis,
           'cabang', p_cabang,
           'baris',  jsonb_build_array(jsonb_build_object(
                       'produk',      p_produk,
                       'batch',       p_batch,
                       'kedaluwarsa', p_kedaluwarsa,
                       'jumlah',      p_jumlah)));
$$;

CREATE FUNCTION sidik_isi(p_isi jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(p_isi::text, 'UTF8')), 'hex');
$$;

-- ---------------------------------------------------------------------
-- Pemroses kejadian stok
-- Kode hasil:
--   BERHASIL        I-1  saldo diubah tepat satu kali
--   SUDAH_DIPROSES  I-2  kunci sudah Berhasil dengan isi sama
--   KONFLIK         I-3  kunci sudah Berhasil dengan isi berbeda
--   DITOLAK         I-1  validasi/bisnis gagal; klaim kunci dibatalkan,
--                        kunci belum terpakai (memungkinkan I-4)
-- Error lain (lock timeout, deadlock, putus koneksi, isolasi salah)
-- TIDAK ditangkap: transaksi pemanggil batal = Gagal teknis sebelum
-- commit bila error diterima sebelum COMMIT.
-- ---------------------------------------------------------------------
CREATE FUNCTION ajukan_kejadian(p_kunci text, p_jenis text, p_cabang text,
                                p_produk text, p_batch text,
                                p_kedaluwarsa date, p_jumlah integer)
RETURNS TABLE (kode text, aturan text, pesan text,
               movement_id bigint, sidik text)
LANGUAGE plpgsql SET search_path = uji_idem AS $$
DECLARE
  v_isi    jsonb;
  v_sidik  text;
  v_klaim  text;
  v_lama   kunci_kejadian%ROWTYPE;
  v_aktif  boolean;
  v_saldo  integer;
  v_delta  integer;
  v_mv     bigint;
BEGIN
  -- Pengaman 1: mekanisme hanya benar pada READ COMMITTED.
  -- Pada REPEATABLE READ/SERIALIZABLE, pengajuan kedua yang menunggu
  -- akan gagal "could not serialize access" alih-alih mendapat I-2.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'ajukan_kejadian wajib dijalankan pada READ COMMITTED (saat ini: %)',
          current_setting('transaction_isolation')
      USING ERRCODE = 'TA900';
  END IF;

  -- Pengaman 2: kunci wajib ada sebelum apa pun.
  IF p_kunci IS NULL OR btrim(p_kunci) = '' OR length(p_kunci) > 100 THEN
    RETURN QUERY SELECT 'DITOLAK'::text, 'I-1'::text,
      'Kunci kejadian kosong atau lebih dari 100 karakter'::text,
      NULL::bigint, NULL::text;
    RETURN;
  END IF;

  v_isi   := isi_kanonik(p_jenis, p_cabang, p_produk, p_batch, p_kedaluwarsa, p_jumlah);
  v_sidik := sidik_isi(v_isi);

  -- Subtransaksi: bila ditolak, SEMUA isinya (termasuk klaim kunci)
  -- dibatalkan, tetapi transaksi pemanggil tetap hidup.
  BEGIN
    -- K-M2/K-M3: klaim kunci sebagai langkah pertama. Bila transaksi lain
    -- sudah mengklaim kunci yang sama dan belum selesai, perintah ini
    -- MENUNGGU sampai transaksi itu commit atau rollback.
    INSERT INTO kunci_kejadian (kunci, sidik_isi, isi)
    VALUES (p_kunci, v_sidik, v_isi)
    ON CONFLICT (kunci) DO NOTHING
    RETURNING kunci INTO v_klaim;

    IF v_klaim IS NULL THEN
      -- K-M4: kunci sudah dimiliki pengajuan yang Berhasil (sudah commit).
      SELECT * INTO STRICT v_lama FROM kunci_kejadian WHERE kunci = p_kunci;
      SELECT min(m.id) INTO v_mv FROM stock_movement m WHERE m.kunci = p_kunci;
      IF v_lama.sidik_isi = v_sidik THEN
        RETURN QUERY SELECT 'SUDAH_DIPROSES'::text, 'I-2'::text,
          'Kunci sudah Berhasil dengan isi sama; hasil sebelumnya dikembalikan, saldo tidak diubah lagi'::text,
          v_mv, v_sidik;
      ELSE
        RETURN QUERY SELECT 'KONFLIK'::text, 'I-3'::text,
          'Kunci sudah Berhasil dengan isi berbeda; ditolak, hasil lama tetap berlaku'::text,
          v_mv, v_lama.sidik_isi;
      END IF;
      RETURN;
    END IF;

    -- Validasi input (I-1). Ditolak = RAISE dengan kode TA001.
    IF p_jenis IS NULL OR p_jenis NOT IN ('MASUK', 'KELUAR') THEN
      RAISE EXCEPTION 'Jenis kejadian tidak valid: % (hanya MASUK atau KELUAR)',
            coalesce(p_jenis, 'NULL') USING ERRCODE = 'TA001';
    END IF;
    IF p_jumlah IS NULL OR p_jumlah <= 0 THEN
      RAISE EXCEPTION 'Jumlah harus lebih dari 0 (diterima: %)',
            coalesce(p_jumlah::text, 'NULL') USING ERRCODE = 'TA001';
    END IF;
    IF coalesce(btrim(p_cabang), '') = '' OR coalesce(btrim(p_produk), '') = ''
       OR coalesce(btrim(p_batch), '') = '' OR p_kedaluwarsa IS NULL THEN
      RAISE EXCEPTION 'Cabang, produk, batch, dan tanggal kedaluwarsa wajib diisi'
        USING ERRCODE = 'TA001';
    END IF;

    -- Validasi bisnis. FOR SHARE mencegah produk dinonaktifkan di tengah proses.
    SELECT p.aktif INTO v_aktif FROM produk p WHERE p.id = p_produk FOR SHARE;
    IF v_aktif IS NULL THEN
      RAISE EXCEPTION 'Produk tidak ditemukan: %', p_produk USING ERRCODE = 'TA001';
    ELSIF NOT v_aktif THEN
      RAISE EXCEPTION 'Produk nonaktif: %', p_produk USING ERRCODE = 'TA001';
    END IF;

    IF p_jenis = 'MASUK' THEN
      INSERT INTO saldo_batch VALUES (p_cabang, p_produk, p_batch, p_kedaluwarsa, 0)
      ON CONFLICT DO NOTHING;
    END IF;

    -- K-M7: kunci baris saldo. Transaksi lain yang mengubah batch yang sama
    -- menunggu di sini, lalu membaca saldo terbaru setelah giliran tiba.
    SELECT s.jumlah INTO v_saldo FROM saldo_batch s
     WHERE (s.cabang, s.produk, s.batch, s.kedaluwarsa)
         = (p_cabang, p_produk, p_batch, p_kedaluwarsa)
       FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch tidak ditemukan di cabang ini' USING ERRCODE = 'TA001';
    END IF;

    v_delta := CASE p_jenis WHEN 'MASUK' THEN p_jumlah WHEN 'KELUAR' THEN -p_jumlah END;
    IF v_saldo + v_delta < 0 THEN
      RAISE EXCEPTION 'Saldo tidak cukup: tersedia %, diminta %', v_saldo, p_jumlah
        USING ERRCODE = 'TA001';
    END IF;

    UPDATE saldo_batch s SET jumlah = s.jumlah + v_delta
     WHERE (s.cabang, s.produk, s.batch, s.kedaluwarsa)
         = (p_cabang, p_produk, p_batch, p_kedaluwarsa);

    INSERT INTO stock_movement (kunci, baris, cabang, produk, batch, kedaluwarsa, perubahan)
    VALUES (p_kunci, 1, p_cabang, p_produk, p_batch, p_kedaluwarsa, v_delta)
    RETURNING id INTO v_mv;

    RETURN QUERY SELECT 'BERHASIL'::text, 'I-1'::text,
      'Diproses; saldo diubah tepat satu kali'::text, v_mv, v_sidik;
    RETURN;

  EXCEPTION
    WHEN SQLSTATE 'TA001' THEN
      RETURN QUERY SELECT 'DITOLAK'::text, 'I-1'::text,
        (SQLERRM || ' — klaim kunci dibatalkan; kunci belum terpakai dan boleh diajukan ulang (I-4)')::text,
        NULL::bigint, v_sidik;
      RETURN;
  END;
END;
$$;

-- ---------------------------------------------------------------------
-- Pemeriksaan status kunci, untuk keadaan "Hasil belum diketahui".
-- Hanya melihat data yang sudah commit. "BELUM_ADA_YANG_BERHASIL"
-- berarti belum ada yang Berhasil PADA SAAT dibaca; langkah aman
-- berikutnya tetap kirim ulang kunci dan isi yang sama.
-- ---------------------------------------------------------------------
CREATE FUNCTION status_kunci(p_kunci text)
RETURNS TABLE (status text, sidik text, movement_id bigint, dicatat_pada timestamptz)
LANGUAGE sql STABLE SET search_path = uji_idem AS $$
  SELECT 'BERHASIL', k.sidik_isi,
         (SELECT min(m.id) FROM stock_movement m WHERE m.kunci = k.kunci),
         k.dicatat_pada
    FROM kunci_kejadian k WHERE k.kunci = p_kunci
  UNION ALL
  SELECT 'BELUM_ADA_YANG_BERHASIL', NULL, NULL, NULL
   WHERE NOT EXISTS (SELECT 1 FROM kunci_kejadian k WHERE k.kunci = p_kunci);
$$;

COMMIT;
```

Data awal untuk percobaan manual (`data-uji.sql`):

```sql
-- data-uji.sql — data awal untuk percobaan manual dua terminal.
-- Jalankan setelah skema-v2.sql. Saldo awal dimasukkan lewat mekanisme yang sama
-- agar saldo dapat direkonsiliasi dengan stock_movement (query V6).
SET search_path = uji_idem;
INSERT INTO produk VALUES ('NUGGET', true), ('SOSIS', false);
SELECT kode, aturan FROM ajukan_kejadian('SALDO-AWAL-1','MASUK','A','NUGGET','B2311A','2027-05-30',10);
```

---

## 4. Cara Menjalankan SQL

1. Siapkan PostgreSQL 13 atau lebih baru (diuji pada 16.15). Gunakan database kosong khusus uji.
2. Buat skema dan fungsi:
   ```bash
   psql -d <database_uji> -f skema-v2.sql
   ```
3. Untuk percobaan manual dua terminal, isi data awal:
   ```bash
   psql -d <database_uji> -f data-uji.sql
   ```
4. Untuk menjalankan semua test case secara otomatis (Linux/macOS, butuh `psql` dan `bash`):
   ```bash
   PGHOST=<host atau folder socket> PGPORT=<port> PGUSER=<user> PGDATABASE=<database_uji> ./jalankan-v2.sh
   ```
   Skrip membuat ulang skema `uji_idem` di setiap skenario, jadi **jangan dijalankan di database yang berisi data penting**.
5. Setelah pengujian manual, jalankan verifikasi:
   ```bash
   psql -d <database_uji> -f verifikasi.sql
   ```
6. Pastikan sesi memakai isolasi standar READ COMMITTED. Untuk uji batas tunggu, pasang `SET lock_timeout = '1s';` di sesi yang menunggu.

Semua objek dibuat di skema `uji_idem` sehingga mudah dihapus: `DROP SCHEMA uji_idem CASCADE;`.

---

## 5. Test Case TC-01 sampai TC-12

Kondisi awal semua TC (kecuali disebut lain): skema baru, produk `NUGGET` aktif dan `SOSIS` nonaktif, saldo awal 10 untuk cabang `A`, produk `NUGGET`, batch `B2311A`, kedaluwarsa 2027-05-30 (dimasukkan lewat kunci `SALDO-AWAL-1`). Isi standar: cabang A, NUGGET, B2311A, 2027-05-30.

| ID | Skenario | Langkah | Hasil yang diharapkan | Data yang diperiksa | Kriteria lulus |
| --- | --- | --- | --- | --- | --- |
| TC-01 | Pengajuan baru berhasil | `ajukan_kejadian('K-TC01','MASUK',…,5)` | `BERHASIL`, I-1 | Saldo, movement per kunci | Saldo 15 dan tepat 1 movement |
| TC-02 | Kunci sama, isi sama | Ulangi TC-01 persis | `SUDAH_DIPROSES`, I-2, `movement_id` sama dengan TC-01 | Saldo, movement, `movement_id` | Saldo tetap 15, movement tetap 1, `movement_id` sama |
| TC-03 | Kunci sama, isi berbeda | Kunci `K-TC01` dengan jumlah 7; batch lain; jenis `KELUAR` | `KONFLIK`, I-3 untuk ketiganya | Saldo, movement | Saldo tetap 15, movement tetap 1 |
| TC-04 | Produk nonaktif | `ajukan_kejadian('K-TC04','MASUK','A','SOSIS',…)`; lalu aktifkan produk dan ajukan ulang kunci sama | Pertama `DITOLAK`; setelah diperbaiki `BERHASIL` (I-4) | Kunci tersimpan, movement | Setelah ditolak: 0 kunci, 0 movement. Setelah diperbaiki: 1 movement |
| TC-05 | Stok tidak mencukupi | `KELUAR` 11 dari saldo 10; `KELUAR` dari batch yang tidak ada | `DITOLAK` untuk keduanya | Saldo, kunci, baris saldo batch fiktif | Saldo tetap 10; 0 kunci; tidak ada baris saldo untuk batch fiktif |
| TC-06 | Jumlah nol atau negatif | Jumlah 0, −3, NULL | `DITOLAK` | Saldo, kunci | Saldo tetap 10; 0 kunci untuk ketiganya |
| TC-07 | Jenis kejadian tidak valid | Jenis `masuk`, `TRANSFER`, NULL; kunci NULL | `DITOLAK` | Saldo | Saldo tetap 10; tidak ada error tak tertangani |
| TC-08 | Bersamaan, kunci sama, isi sama | Sesi A: `BEGIN` + ajukan, tahan. Sesi B: ajukan kunci sama. A `COMMIT` | B **menunggu**, lalu `SUDAH_DIPROSES`; A `BERHASIL` | `pg_stat_activity` sesi B, saldo, movement | B berstatus `Lock` sebelum A commit; saldo 15; tepat 1 movement |
| TC-09 | Bersamaan, kunci sama, isi berbeda | Seperti TC-08, B jumlah 7 | B menunggu, lalu `KONFLIK`; A `BERHASIL` | Sama seperti TC-08 | Saldo 15 (isi A); tepat 1 movement |
| TC-10 | A rollback, B mencoba kunci sama | Seperti TC-08, A `ROLLBACK`. Varian 10b: A ditolak bisnis tetapi transaksinya masih terbuka | B menunggu lalu `BERHASIL`. Varian 10b: B **tidak menunggu** dan `BERHASIL` | Status sesi B, saldo, movement | Saldo 15; tepat 1 movement; pada 10b status B bukan `Lock` |
| TC-11 | Dua kunci berbeda, batch sama | Saldo 10. A: `KELUAR` 8 kunci berbeda, tahan. B: `KELUAR` 8. A `COMMIT`. Varian 11b: A `ROLLBACK` | B menunggu kunci baris saldo, lalu `DITOLAK` (saldo 2). Varian 11b: B `BERHASIL` | Status sesi B, saldo, kunci B | Saldo 2 di kedua varian; tidak pernah negatif; kunci B tidak tersimpan bila ditolak |
| TC-12 | Koneksi terputus / hasil commit tidak diketahui | 12a: A `BEGIN` + ajukan, koneksi A diputus (`pg_terminate_backend`) sebelum commit. 12b: A `BEGIN` + ajukan + `COMMIT`, jawaban tidak dibaca. Lalu `status_kunci` dan kirim ulang isi sama | 12a: status `BELUM_ADA_YANG_BERHASIL`, kirim ulang `BERHASIL`. 12b: status `BERHASIL` dengan sidik sama, kirim ulang `SUDAH_DIPROSES` | Status kunci, sidik, saldo, movement | Di kedua varian saldo hanya berubah satu kali dan tepat 1 movement |

Test case regresi tambahan dari hasil audit:

| ID | Skenario | Kriteria lulus |
| --- | --- | --- |
| TC-13 | Fungsi dipanggil pada REPEATABLE READ | Ditolak dengan pesan "wajib dijalankan pada READ COMMITTED"; saldo tidak berubah (A-04) |
| TC-14 | Kirim ulang isi sama dengan `DateStyle` berbeda | `SUDAH_DIPROSES`, bukan konflik palsu (A-05) |
| TC-15 | Isi berbeda yang dulu bertabrakan (`A\|B`/`C` vs `A`/`B\|C`) | `KONFLIK`, bukan `SUDAH_DIPROSES` (A-03) |
| TC-16 | Sesi kedua dengan `lock_timeout = 1s` saat sesi A masih menahan | Sesi kedua error *lock timeout*; kirim ulang setelah A commit `SUDAH_DIPROSES`; tepat 1 movement |

### 5.1 Hasil pengujian yang sudah dijalankan

Lingkungan: PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1, x86_64), satu mesin, koneksi lewat socket lokal, isolasi READ COMMITTED. Tanggal: 10 November 2026. Skrip: `jalankan-v2.sh`. Keluaran lengkap: `hasil-uji-v2.txt`.

| ID | Hasil aktual | Status |
| --- | --- | --- |
| TC-01 | BERHASIL; saldo 15; 1 movement | PASS |
| TC-02 | SUDAH_DIPROSES; saldo 15; 1 movement; `movement_id` sama | PASS |
| TC-03 | KONFLIK untuk jumlah lain, batch lain, dan jenis lain; saldo 15; 1 movement | PASS |
| TC-04 | DITOLAK; 0 kunci, 0 movement. Setelah produk aktif: BERHASIL dengan kunci sama; 1 movement | PASS |
| TC-05 | DITOLAK untuk stok kurang dan batch tidak ada; saldo 10; 0 kunci; tidak ada baris saldo batch fiktif | PASS |
| TC-06 | DITOLAK untuk 0, −3, NULL; saldo 10; 0 kunci | PASS |
| TC-07 | DITOLAK untuk `masuk`, `TRANSFER`, NULL, dan kunci NULL; saldo 10 | PASS |
| TC-08 | Sesi B `Lock` sebelum A commit; saldo dari luar tetap 10; A BERHASIL; B SUDAH_DIPROSES; saldo 15; 1 movement | PASS |
| TC-09 | Sesi B `Lock`; A BERHASIL; B KONFLIK; saldo 15; 1 movement | PASS |
| TC-10 | Sesi B `Lock`; A rollback; B BERHASIL; saldo 15; 1 movement. 10b: B tidak menunggu (`Client`), A DITOLAK, B BERHASIL; 1 movement | PASS |
| TC-11 | Sesi B `Lock`; A BERHASIL; B DITOLAK; saldo 2; kunci B tidak tersimpan. 11b: A rollback, B BERHASIL; saldo 2 | PASS |
| TC-12 | 12a: setelah putus `BELUM_ADA_YANG_BERHASIL`, saldo 10, kirim ulang BERHASIL, 1 movement. 12b: `BERHASIL`, sidik sama, kirim ulang SUDAH_DIPROSES, saldo 15, 1 movement | PASS |
| TC-13 | Ditolak dengan pesan isolasi; saldo 10 | PASS |
| TC-14 | SUDAH_DIPROSES dengan `DateStyle='SQL, DMY'` | PASS |
| TC-15 | KONFLIK | PASS |
| TC-16 | Sesi kedua: *canceling statement due to lock timeout*; kirim ulang SUDAH_DIPROSES; 1 movement | PASS |
| Verifikasi akhir | V3, V4, V5, V6, V7: 0 pelanggaran | PASS |

Total **77 pemeriksaan, 77 PASS, 0 FAIL**. Rangkaian diulang **5 kali** dengan hasil sama. Temuan A-01 s.d. A-05, A-07, dan A-08 dibuktikan dengan menjalankan SQL awal (kontrol negatif) sebelum perbaikan.

---

## 6. Simulasi Concurrency Dua Sesi

Buka dua terminal ke database uji yang sama. Jalankan `skema-v2.sql` dan `data-uji.sql` lebih dulu. Di kedua terminal:

```sql
SET search_path = uji_idem;
SHOW transaction_isolation;   -- harus: read committed
```

Opsional, terminal ketiga untuk melihat siapa yang menunggu:

```sql
SELECT pid, application_name, state, wait_event_type, wait_event, left(query, 60)
  FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();
```

### 6.1 Simulasi 1 — Sesi A commit, sesi B mendapat I-2

| Waktu | Terminal A | Terminal B | Yang harus terlihat |
| --- | --- | --- | --- |
| T1 | `BEGIN;` | | |
| T2 | `SELECT * FROM ajukan_kejadian('K001','MASUK','A','NUGGET','B2311A','2027-05-30',5);` | | A: `BERHASIL`, I-1. Transaksi A **belum commit** |
| T3 | (diam) | `SELECT * FROM ajukan_kejadian('K001','MASUK','A','NUGGET','B2311A','2027-05-30',5);` | B **tidak kembali**; terminal ketiga menunjukkan B `Lock / transactionid` |
| T4 | | `-- dari terminal ketiga:` `SELECT jumlah FROM uji_idem.saldo_batch;` | Masih 10 (perubahan A belum terlihat) |
| T5 | `COMMIT;` | | |
| T6 | | (perintah T3 selesai sendiri) | B: `SUDAH_DIPROSES`, I-2, `movement_id` sama dengan A |
| T7 | `SELECT jumlah FROM saldo_batch;` `SELECT count(*) FROM stock_movement WHERE kunci='K001';` | | Saldo 15; movement 1 |

### 6.2 Simulasi 2 — Sesi A rollback, sesi B memproses kunci yang sama

| Waktu | Terminal A | Terminal B | Yang harus terlihat |
| --- | --- | --- | --- |
| T1 | `BEGIN;` | | |
| T2 | `SELECT * FROM ajukan_kejadian('K002','MASUK','A','NUGGET','B2311A','2027-05-30',5);` | | A: `BERHASIL` (belum commit) |
| T3 | | `SELECT * FROM ajukan_kejadian('K002','MASUK','A','NUGGET','B2311A','2027-05-30',5);` | B menunggu (`Lock`) |
| T4 | `ROLLBACK;` | | Klaim kunci A ikut batal |
| T5 | | (perintah T3 selesai sendiri) | B: `BERHASIL`, I-1 |
| T6 | `SELECT count(*) FROM stock_movement WHERE kunci='K002';` | | 1 (milik B) |

### 6.3 Simulasi 3 — Kunci sama, isi berbeda

Ulangi simulasi 1 dengan kunci `K003`, tetapi di terminal B jumlahnya 7. Setelah A `COMMIT`, B mendapat `KONFLIK`, I-3. Saldo hanya bertambah 5 (isi A), dan movement `K003` tetap 1.

### 6.4 Simulasi 4 — Penolakan bisnis melepas klaim tanpa menunggu akhir transaksi

| Waktu | Terminal A | Terminal B | Yang harus terlihat |
| --- | --- | --- | --- |
| T1 | `BEGIN;` | | |
| T2 | `SELECT * FROM ajukan_kejadian('K004','MASUK','A','SOSIS','S01','2027-01-01',5);` | | A: `DITOLAK` (produk nonaktif); transaksi A masih terbuka |
| T3 | | `UPDATE produk SET aktif = true WHERE id = 'SOSIS';` | |
| T4 | | `SELECT * FROM ajukan_kejadian('K004','MASUK','A','SOSIS','S01','2027-01-01',5);` | B **tidak menunggu**; langsung `BERHASIL` |
| T5 | `COMMIT;` | | Movement `K004` = 1 |

### 6.5 Simulasi 5 — Dua kunci berbeda menarik batch yang sama

| Waktu | Terminal A | Terminal B | Yang harus terlihat |
| --- | --- | --- | --- |
| T0 | Jalankan ulang `skema-v2.sql` dan `data-uji.sql` (saldo 10) | | |
| T1 | `BEGIN;` | | |
| T2 | `SELECT * FROM ajukan_kejadian('K-A','KELUAR','A','NUGGET','B2311A','2027-05-30',8);` | | A: `BERHASIL` (belum commit) |
| T3 | | `SELECT * FROM ajukan_kejadian('K-B','KELUAR','A','NUGGET','B2311A','2027-05-30',8);` | B menunggu kunci baris saldo |
| T4 | `COMMIT;` | | |
| T5 | | (selesai sendiri) | B: `DITOLAK`, saldo tidak cukup (tersedia 2) |
| T6 | `SELECT jumlah FROM saldo_batch;` | | 2, tidak negatif |

### 6.6 Simulasi 6 — Batas waktu tunggu

Ulangi simulasi 1 dengan kunci `K006`, tetapi sebelum T3 jalankan `SET lock_timeout = '1s';` di terminal B. B berhenti dengan *canceling statement due to lock timeout* (perlakukan sebagai **Hasil belum diketahui**). Setelah A `COMMIT`, jalankan ulang perintah B: hasilnya `SUDAH_DIPROSES`.

---

## 7. Query Verifikasi

File: `verifikasi.sql`. Setiap query "PELANGGARAN" harus menghasilkan 0 baris.

```sql
-- =====================================================================
-- verifikasi.sql — Query verifikasi setelah pengujian (skema uji_idem)
-- Setiap query "pelanggaran" harus menghasilkan 0 baris agar LULUS.
-- =====================================================================
SET search_path = uji_idem;

\echo '== V1. Saldo batch setelah pengujian =='
SELECT cabang, produk, batch, kedaluwarsa, jumlah
  FROM saldo_batch ORDER BY cabang, produk, batch;

\echo '== V2. Jumlah stock movement per kunci =='
SELECT k.kunci, count(m.id) AS jumlah_movement, coalesce(sum(m.perubahan), 0) AS total_perubahan
  FROM kunci_kejadian k LEFT JOIN stock_movement m USING (kunci)
 GROUP BY k.kunci ORDER BY k.kunci;

\echo '== V3. PELANGGARAN: kunci Berhasil tanpa stock movement (kunci tertinggal), harus 0 baris =='
SELECT k.kunci FROM kunci_kejadian k
 WHERE NOT EXISTS (SELECT 1 FROM stock_movement m WHERE m.kunci = k.kunci);

\echo '== V4. PELANGGARAN: lebih dari satu movement per baris kunci (perubahan ganda), harus 0 baris =='
SELECT kunci, baris, count(*) FROM stock_movement
 GROUP BY kunci, baris HAVING count(*) > 1;

\echo '== V5. PELANGGARAN: saldo negatif, harus 0 baris =='
SELECT * FROM saldo_batch WHERE jumlah < 0;

\echo '== V6. PELANGGARAN: saldo tidak sama dengan jumlah semua movement batch itu, harus 0 baris =='
-- Berlaku bila saldo awal juga dimasukkan lewat ajukan_kejadian (seperti data uji).
SELECT s.cabang, s.produk, s.batch, s.kedaluwarsa, s.jumlah,
       coalesce(sum(m.perubahan), 0) AS jumlah_dari_movement
  FROM saldo_batch s
  LEFT JOIN stock_movement m
    ON (m.cabang, m.produk, m.batch, m.kedaluwarsa) = (s.cabang, s.produk, s.batch, s.kedaluwarsa)
 GROUP BY s.cabang, s.produk, s.batch, s.kedaluwarsa, s.jumlah
HAVING s.jumlah <> coalesce(sum(m.perubahan), 0);

\echo '== V7. PELANGGARAN: sidik tersimpan tidak cocok dengan isi tersimpan, harus 0 baris =='
SELECT kunci FROM kunci_kejadian WHERE sidik_isi <> sidik_isi(isi);

\echo '== V8. PELANGGARAN: isi movement tidak sesuai isi kunci, harus 0 baris =='
SELECT m.kunci, m.id FROM stock_movement m JOIN kunci_kejadian k USING (kunci)
 WHERE (k.isi->>'cabang') <> m.cabang
    OR (k.isi->'baris'->0->>'produk') <> m.produk
    OR (k.isi->'baris'->0->>'batch') <> m.batch
    OR (k.isi->'baris'->0->>'kedaluwarsa')::date <> m.kedaluwarsa
    OR abs(m.perubahan) <> (k.isi->'baris'->0->>'jumlah')::int
    OR sign(m.perubahan) <> CASE k.isi->>'jenis' WHEN 'MASUK' THEN 1 ELSE -1 END;
```

| Query | Memeriksa |
| --- | --- |
| V1 | Saldo batch setelah pengujian |
| V2 | Jumlah stock movement per kunci |
| V3 | Kunci tertinggal: kunci Berhasil tanpa stock movement |
| V4 | Perubahan stok ganda: lebih dari satu movement per baris kunci |
| V5 | Saldo negatif |
| V6 | Kesesuaian saldo dengan seluruh movement (rekonsiliasi) |
| V7 | Kesesuaian sidik dengan isi tersimpan |
| V8 | Kesesuaian isi movement dengan isi kunci kejadian |

Kunci yang ditolak bisnis tidak tersimpan sama sekali, sehingga "tidak ada kunci tertinggal akibat penolakan bisnis" dibuktikan oleh V3 dan oleh pemeriksaan jumlah kunci di TC-04, TC-05, TC-06, dan TC-11.

---

## 8. Template Laporan Pengujian

Isi satu blok per pengujian. Jangan mengisi "Hasil aktual" sebelum SQL benar-benar dijalankan.

```markdown
### Laporan Pengujian Idempotency

| Butir | Isi |
| --- | --- |
| Nama pengujian | TC-__ : ______________________ |
| Versi SQL | skema-v2.sql (tanggal file: __________) |
| Lingkungan PostgreSQL | Hasil `SELECT version();`: ______________________ |
| Isolasi | Hasil `SHOW transaction_isolation;`: __________ |
| Tanggal pengujian | ____-__-__ __:__ WIB |
| Penguji | ______________________ |
| Skenario | ______________________ |
| Kondisi awal | Saldo awal: ____ ; produk aktif: ____ |
| Langkah | 1. ____  2. ____  3. ____ |
| Hasil yang diharapkan | Kode: ______ ; saldo: ____ ; jumlah movement: ____ |
| Hasil aktual | Kode: ______ ; saldo: ____ ; jumlah movement: ____ |
| Status | PASS / FAIL |
| Bukti query | Tempel keluaran V1–V8 dan `pg_stat_activity` (untuk uji dua sesi) |
| Catatan temuan | ______________________ |
```

Ringkasan untuk seluruh rangkaian:

```markdown
| ID | Skenario | Diharapkan | Aktual | Status | Bukti |
| --- | --- | --- | --- | --- | --- |
| TC-01 | Pengajuan baru | BERHASIL, saldo +5, 1 movement | | | |
| TC-02 | Kunci sama, isi sama | SUDAH_DIPROSES, saldo tetap | | | |
| TC-03 | Kunci sama, isi berbeda | KONFLIK, saldo tetap | | | |
| TC-04 | Produk nonaktif | DITOLAK, 0 kunci; setelah diperbaiki BERHASIL | | | |
| TC-05 | Stok tidak cukup | DITOLAK, saldo tetap | | | |
| TC-06 | Jumlah 0/negatif | DITOLAK | | | |
| TC-07 | Jenis tidak valid | DITOLAK | | | |
| TC-08 | Bersamaan, isi sama | B menunggu lalu SUDAH_DIPROSES, 1 movement | | | |
| TC-09 | Bersamaan, isi berbeda | B menunggu lalu KONFLIK, 1 movement | | | |
| TC-10 | A rollback | B menunggu lalu BERHASIL, 1 movement | | | |
| TC-11 | Dua kunci, batch sama | Satu BERHASIL, satu DITOLAK, saldo tidak negatif | | | |
| TC-12 | Hasil commit tidak diketahui | Saldo berubah tepat satu kali | | | |
```

---

## 9. Rekomendasi Revisi Stage 4 v0.6

### 9.1 Bagian yang perlu diperkuat

| Bagian Stage 4 v0.6 | Rekomendasi | Dasar |
| --- | --- | --- |
| 6.2.1, tabel K-M | Tambah syarat **isolasi READ COMMITTED** (atau penanganan error serialisasi) sebagai mekanisme tersendiri | A-04, TC-13 |
| 6.2.1, K-M5 (sidik isi) | Tegaskan sidik dibuat dari **serialisasi yang tidak ambigu** (misalnya JSON kanonik), **tidak bergantung pengaturan format tanggal**, tanpa normalisasi nilai, memakai SHA-256. Larang penggabungan teks dengan karakter pemisah | A-03, A-05, TC-14, TC-15 |
| 6.2.1, aturan I-1 | Tambah daftar validasi minimum sebelum pemrosesan: jenis hanya MASUK/KELUAR, jumlah > 0, kunci dan identitas batch wajib ada, batch wajib ada untuk barang keluar | A-01, A-02, A-07, A-08 |
| 5.2 (Hasil belum diketahui) dan 6.2.1 | Sebutkan dua jalur pemastian: **baca status kunci** di ERP atau **kirim ulang isi sama**, dan bahwa status "belum ada yang berhasil" bukan bukti final bila pengajuan lain masih berjalan | A-06, L-03, TC-12 |
| 6.2.1, I-2 | Tegaskan I-2 mengembalikan **identitas hasil sebelumnya** (misalnya nomor stock movement), bukan hanya pesan | A-10, TC-02 |
| 6.2.1, K-M7 | Tambah syarat **urutan penguncian tetap** untuk kejadian multi-baris guna mencegah deadlock | L-01 |
| 6.2.1, hasil pengujian prototipe | Ganti dengan hasil SQL v2. Catat terang bahwa SQL di v0.6 punya celah validasi dan sidik isi, meskipun mekanisme concurrency-nya terbukti benar | Bagian 2.1 dan 2.2 |
| 8.1 P-07 | Tambah keputusan: database terpilih wajib lulus TC-08 s.d. TC-12 sebelum Tahap 8 | L-05 |

### 9.2 Pemisahan status informasi

| Kategori | Isi |
| --- | --- |
| **Fakta yang sudah dibuktikan lewat pengujian** (PostgreSQL 16.15) | Unique constraint + klaim kunci di dalam transaksi membuat pengajuan kedua dengan kunci sama menunggu, lalu mendapat I-2 atau I-3 setelah yang pertama commit, atau diproses I-1 setelah yang pertama rollback. Penolakan bisnis di dalam savepoint langsung melepas klaim. Kunci baris saldo + CHECK mencegah saldo negatif untuk kunci berbeda. Untuk setiap kunci tidak pernah ada lebih dari satu movement. Isolasi REPEATABLE READ membuat mekanisme gagal (error serialisasi). Penggabungan teks dengan pemisah dan konversi tanggal berbasis DateStyle menghasilkan sidik yang salah |
| **Hasil analisis teknis** | Perlunya `FOR SHARE` pada produk (A-13); perlunya batas tunggu (A-12); risiko deadlock multi-baris (L-01); bahwa logika pemulihan hasil commit yang hilang sama dengan TC-12b |
| **Asumsi yang belum diverifikasi** | MySQL/InnoDB berperilaku sama; mekanisme tetap benar pada arsitektur layanan terpisah (Stage 4 §6.4, UJI-6); kinerja dengan banyak sesi; ERP tim akan memakai pola ini (E-02, AS-3) |
| **Rekomendasi untuk implementasi sebenarnya** | Pakai pola klaim kunci + savepoint seperti v2 di layanan stok ERP; urutan penguncian tetap untuk multi-baris; tulis log penolakan dan kegagalan di luar transaksi utama; pasang `lock_timeout` di sisi aplikasi; sediakan fungsi baca status kunci; jalankan TC-01 s.d. TC-16 di database pilihan tim sebagai uji integrasi ERP–SCM |

---

## 10. Kesimpulan Kesiapan SQL untuk Diuji

1. **`skema-v2.sql` siap diuji ulang oleh tim.** SQL ini sudah dijalankan pada PostgreSQL 16.15 dan lulus 77 dari 77 pemeriksaan, termasuk enam skenario dua sesi yang dibuktikan menunggu lewat `pg_stat_activity`. Hasilnya stabil dalam lima kali pengulangan.
2. **Klaim yang boleh dibuat:** untuk pengajuan satu baris pada PostgreSQL 16 dengan isolasi READ COMMITTED, dua pengajuan bersamaan dengan kunci yang sama tidak menghasilkan perubahan stok ganda, dan saldo tidak menjadi negatif.
3. **Klaim yang belum boleh dibuat:** keamanan untuk kejadian multi-baris, database selain PostgreSQL, arsitektur layanan terpisah, dan beban tinggi.
4. **SQL ini bukan skema produksi.** Struktur tabel, nama kolom, dan tipe data final tetap dirancang di Tahap 5 bersama Kayla.
5. **SQL awal tidak boleh dipakai lagi** sebagai rujukan karena temuan kritis A-01, A-02, dan A-03.
