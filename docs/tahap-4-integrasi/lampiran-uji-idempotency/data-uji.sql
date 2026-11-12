-- data-uji.sql — data awal untuk percobaan manual dua terminal.
-- Jalankan setelah skema-v2.sql. Saldo awal dimasukkan lewat mekanisme yang sama
-- agar saldo dapat direkonsiliasi dengan stock_movement (query V6).
SET search_path = uji_idem;
INSERT INTO produk VALUES ('NUGGET', true), ('SOSIS', false);
SELECT kode, aturan FROM ajukan_kejadian('SALDO-AWAL-1','MASUK','A','NUGGET','B2311A','2027-05-30',10);
