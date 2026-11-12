#!/bin/bash
# Pengujian mekanisme idempotency pada PostgreSQL 16 sungguhan.
P="psql -h /tmp/pgtest -p 5499 -U postgres -qtA -v ON_ERROR_STOP=1"
reset(){ $P -f skema.sql >/dev/null; $P -c "INSERT INTO produk VALUES ('NUGGET',true),('SOSIS',false);" >/dev/null; }
q(){ $P -c "SELECT ajukan_kejadian($1);"; }
cek(){ echo "   saldo A NUGGET: $($P -c "SELECT coalesce(sum(jumlah),0) FROM saldo_batch WHERE cabang='A' AND produk='NUGGET';") | stock movement kunci $1: $($P -c "SELECT count(*) FROM stock_movement WHERE kunci='$1';")"; }
G="'GR-202611-0007','MASUK','A','NUGGET','B2311A','2027-05-30'"

echo "== UJI BERURUTAN =="
reset
echo "UJI-1  : $(q "$G,20")"; cek GR-202611-0007
echo "UJI-2  : $(q "$G,20")"; cek GR-202611-0007
echo "UJI-3  : $(q "$G,25")"; cek GR-202611-0007
echo "UJI-4  : $(q "'GR-202611-0007','MASUK','A','NUGGET','B2311B','2027-05-30',20")"; cek GR-202611-0007
echo "UJI-8  : $(q "'GR-202611-0008','MASUK','A','SOSIS','S01','2027-01-01',5")"; echo "   stock movement GR-202611-0008: $($P -c "SELECT count(*) FROM stock_movement WHERE kunci='GR-202611-0008';") | kunci tersimpan: $($P -c "SELECT count(*) FROM kunci_kejadian WHERE kunci='GR-202611-0008';")"
$P -c "UPDATE produk SET aktif=true WHERE id='SOSIS';"
echo "UJI-9  : $(q "'GR-202611-0008','MASUK','A','SOSIS','S01','2027-01-01',5")"
echo "UJI-10 : $(q "'GR-202611-0008','MASUK','A','SOSIS','S01','2027-01-01',5")"; echo "   stock movement GR-202611-0008: $($P -c "SELECT count(*) FROM stock_movement WHERE kunci='GR-202611-0008';")"

echo; echo "== UJI-14: dua permintaan BERSAMAAN, kunci sama, isi sama =="
reset
( echo "   permintaan 1: $(q "$G,20,2")" ) & sleep 0.3
( echo "   permintaan 2: $(q "$G,20,0")" ) & wait
cek GR-202611-0007

echo; echo "== UJI-15: dua permintaan BERSAMAAN, kunci sama, isi berbeda (20 vs 25) =="
reset
( echo "   permintaan 1 (20): $(q "$G,20,2")" ) & sleep 0.3
( echo "   permintaan 2 (25): $(q "$G,25,0")" ) & wait
cek GR-202611-0007

echo; echo "== UJI-16: BERSAMAAN, kunci sama; permintaan 1 ditolak bisnis, permintaan 2 valid =="
reset; $P -c "INSERT INTO saldo_batch VALUES ('A','NUGGET','B2311A','2027-05-30',10);"
K="'TR-202611-0003-KIRIM','KELUAR','A','NUGGET','B2311A','2027-05-30'"
( echo "   permintaan 1 (keluar 15, saldo 10): $(q "$K,15,2")" ) & sleep 0.3
( echo "   permintaan 2 (keluar 10): $(q "$K,10,0")" ) & wait
cek TR-202611-0003-KIRIM

echo; echo "== UJI-17: dua kunci BERBEDA bersamaan menarik batch yang sama (saldo 10, masing-masing 8) =="
reset; $P -c "INSERT INTO saldo_batch VALUES ('A','NUGGET','B2311A','2027-05-30',10);"
( echo "   TR-0004-KIRIM: $(q "'TR-202611-0004-KIRIM','KELUAR','A','NUGGET','B2311A','2027-05-30',8,1")" ) & sleep 0.3
( echo "   TR-0005-KIRIM: $(q "'TR-202611-0005-KIRIM','KELUAR','A','NUGGET','B2311A','2027-05-30',8,0")" ) & wait
echo "   saldo A: $($P -c "SELECT jumlah FROM saldo_batch WHERE cabang='A';") | total stock movement: $($P -c "SELECT count(*) FROM stock_movement;")"

echo; echo "== UJI-18: permintaan 2 menyerah menunggu (lock_timeout 1 dtk) saat permintaan 1 masih diproses =="
reset
( echo "   permintaan 1: $(q "$G,20,3")" ) & sleep 0.3
( echo "   permintaan 2: $(psql -h /tmp/pgtest -p 5499 -U postgres -qtA -c "SET lock_timeout='1s'; SELECT ajukan_kejadian($G,20,0);" 2>&1 | grep ERROR)" ) & wait
echo "   permintaan 2 dikirim ulang setelah itu: $(q "$G,20")"; cek GR-202611-0007

echo; echo "== UJI-19: proses 1 terputus di tengah (koneksi diputus sebelum commit), lalu dikirim ulang =="
reset
( $P -c "SELECT ajukan_kejadian($G,20,5);" >/dev/null 2>&1; echo "   permintaan 1: koneksi terputus, hasil tidak diterima klien" ) & sleep 1
$P -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%ajukan_kejadian(''GR-202611-0007''%' AND pid<>pg_backend_pid();" >/dev/null; wait
cek GR-202611-0007
echo "   kirim ulang isi sama: $(q "$G,20")"; cek GR-202611-0007
