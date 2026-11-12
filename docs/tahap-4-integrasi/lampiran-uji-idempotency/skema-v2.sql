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
