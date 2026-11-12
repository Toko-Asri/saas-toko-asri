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
