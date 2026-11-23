-- Skema MINIMAL khusus pengujian mekanisme. BUKAN rancangan database Tahap 5.
DROP TABLE IF EXISTS stock_movement, kunci_kejadian, saldo_batch, produk CASCADE;
CREATE TABLE produk (id text PRIMARY KEY, aktif boolean NOT NULL);
CREATE TABLE saldo_batch (
  cabang text, produk text, batch text, kedaluwarsa date,
  jumlah int NOT NULL CHECK (jumlah >= 0),            -- PK-9: saldo tidak boleh negatif
  PRIMARY KEY (cabang, produk, batch, kedaluwarsa));
CREATE TABLE kunci_kejadian (
  kunci text PRIMARY KEY,                              -- unique constraint pada kunci kejadian
  sidik_isi text NOT NULL,                             -- sidik isi ternormalisasi
  dicatat_pada timestamptz NOT NULL DEFAULT now());
CREATE TABLE stock_movement (
  id bigserial PRIMARY KEY, kunci text NOT NULL REFERENCES kunci_kejadian(kunci),
  cabang text, produk text, batch text, kedaluwarsa date, perubahan int);

-- Satu baris per pengajuan untuk menyederhanakan uji. Isi multi-baris memakai sidik yang sama konsepnya.
CREATE OR REPLACE FUNCTION ajukan_kejadian(p_kunci text, p_jenis text, p_cabang text, p_produk text,
  p_batch text, p_kedaluwarsa date, p_jumlah int, p_tunda numeric DEFAULT 0)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_sidik text := md5(concat_ws('|', p_jenis, p_cabang, p_produk, p_batch, p_kedaluwarsa, p_jumlah));
  v_sidik_lama text; v_n int; v_delta int; v_aktif boolean;
BEGIN
  BEGIN  -- blok ini = savepoint; penolakan bisnis membatalkan seluruh isinya, termasuk klaim kunci
    -- 1. Klaim kunci. Bila transaksi lain sedang memegang kunci yang sama dan belum commit,
    --    perintah ini MENUNGGU sampai transaksi itu commit atau rollback.
    INSERT INTO kunci_kejadian(kunci, sidik_isi) VALUES (p_kunci, v_sidik)
      ON CONFLICT (kunci) DO NOTHING;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      -- Kunci sudah dimiliki pengajuan yang Berhasil (commit). Bandingkan isi.
      SELECT sidik_isi INTO v_sidik_lama FROM kunci_kejadian WHERE kunci = p_kunci;
      IF v_sidik_lama = v_sidik THEN RETURN 'I-2 SUDAH DIPROSES (saldo tidak diubah lagi)';
      ELSE RETURN 'I-3 DITOLAK: KONFLIK IDEMPOTENCY (saldo tidak diubah)'; END IF;
    END IF;
    -- 2. Validasi bisnis (I-1)
    SELECT aktif INTO v_aktif FROM produk WHERE id = p_produk;
    IF NOT coalesce(v_aktif,false) THEN RAISE EXCEPTION 'DITOLAK ERP: produk nonaktif'; END IF;
    PERFORM pg_sleep(p_tunda);                        -- mensimulasikan pemrosesan yang lama
    v_delta := CASE p_jenis WHEN 'MASUK' THEN p_jumlah ELSE -p_jumlah END;
    INSERT INTO saldo_batch VALUES (p_cabang,p_produk,p_batch,p_kedaluwarsa,0) ON CONFLICT DO NOTHING;
    PERFORM 1 FROM saldo_batch WHERE (cabang,produk,batch,kedaluwarsa)=(p_cabang,p_produk,p_batch,p_kedaluwarsa)
      FOR UPDATE;                                     -- kunci baris saldo
    UPDATE saldo_batch SET jumlah = jumlah + v_delta
      WHERE (cabang,produk,batch,kedaluwarsa)=(p_cabang,p_produk,p_batch,p_kedaluwarsa);
    INSERT INTO stock_movement(kunci,cabang,produk,batch,kedaluwarsa,perubahan)
      VALUES (p_kunci,p_cabang,p_produk,p_batch,p_kedaluwarsa,v_delta);
    RETURN 'I-1 BERHASIL (saldo diubah satu kali)';
  EXCEPTION
    WHEN raise_exception THEN RETURN 'I-1 '||SQLERRM||' (klaim kunci dibatalkan, kunci belum terpakai)';
    WHEN check_violation THEN RETURN 'I-1 DITOLAK ERP: saldo tidak cukup (klaim kunci dibatalkan, kunci belum terpakai)';
  END;
END $$;
