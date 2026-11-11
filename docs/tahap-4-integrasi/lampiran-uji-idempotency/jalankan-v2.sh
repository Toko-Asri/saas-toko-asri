#!/bin/bash
# =====================================================================
# jalankan-v2.sh — Pengujian TC-01 s.d. TC-12 (+ TC-13 s.d. TC-16 regresi)
# untuk skema-v2.sql. Skenario bersamaan memakai DUA sesi psql sungguhan
# yang dikendalikan lewat FIFO. Sebelum sesi A di-commit/rollback, skrip
# memeriksa pg_stat_activity untuk memastikan sesi B benar-benar
# menunggu lock (bukan sekadar urutan waktu).
#
# Pemakaian: PGHOST=... PGPORT=... PGUSER=... ./jalankan-v2.sh
# =====================================================================
set -u
export PGHOST=${PGHOST:-/tmp/pgtest} PGPORT=${PGPORT:-5499} PGUSER=${PGUSER:-postgres}
export PGOPTIONS='-c client_min_messages=warning'
P="psql -qtA -X -v ON_ERROR_STOP=1"
DIR=$(cd "$(dirname "$0")" && pwd)
LULUS=0; GAGAL=0

periksa(){ # periksa <nama> <aktual> <harapan>
  if [ "$2" == "$3" ]; then echo "   [PASS] $1: $2"; LULUS=$((LULUS+1))
  else echo "   [FAIL] $1: aktual='$2' harapan='$3'"; GAGAL=$((GAGAL+1)); fi; }
sql(){ $P -c "SET search_path=uji_idem; $1" | tail -n +1; }
ajukan(){ sql "SELECT kode FROM ajukan_kejadian($1);"; }
saldo(){ sql "SELECT coalesce((SELECT jumlah FROM saldo_batch WHERE cabang='A' AND produk='NUGGET' AND batch='B2311A'),0);"; }
mv(){ sql "SELECT count(*) FROM stock_movement WHERE kunci='$1';"; }
ada_kunci(){ sql "SELECT count(*) FROM kunci_kejadian WHERE kunci='$1';"; }

reset(){
  $P -f "$DIR/skema-v2.sql" >/dev/null
  sql "INSERT INTO produk VALUES ('NUGGET',true),('SOSIS',false),('A',true),('A|B',true);" >/dev/null
  # Saldo awal dimasukkan lewat mekanisme yang sama agar bisa direkonsiliasi (V6).
  sql "SELECT kode FROM ajukan_kejadian('SALDO-AWAL-1','MASUK','A','NUGGET','B2311A','2027-05-30',10);" >/dev/null
}

# ---- pengendali dua sesi ----
buka(){ rm -f /tmp/$1.in /tmp/$1.out; mkfifo /tmp/$1.in
  ( psql -qtA -X < /tmp/$1.in > /tmp/$1.out 2>&1 ) &
  eval "exec {fd_$1}>/tmp/$1.in"
  kirim $1 "SET application_name='sesi_$1'; SET search_path=uji_idem;"; sleep 0.3; }
kirim(){ local v="fd_$1"; echo "$2" >&${!v}; }
tutup(){ local v="fd_$1"; eval "exec ${!v}>&-"; sleep 0.4; }
hasil(){ grep -v '^SET$' /tmp/$1.out | tail -n 1; }
status_sesi(){ sleep ${2:-0.8}; $P -c "SELECT coalesce(wait_event_type,'-') FROM pg_stat_activity WHERE application_name='sesi_$1';"; }
pid_sesi(){ $P -c "SELECT pid FROM pg_stat_activity WHERE application_name='sesi_$1';"; }

ISI="'A','NUGGET','B2311A','2027-05-30'"

echo "=== Lingkungan ==="
$P -c "SELECT version();"
echo "Tanggal uji: $(date '+%Y-%m-%d %H:%M %Z')"

echo; echo "=== TC-01 Pengajuan baru berhasil ==="
reset
periksa "kode" "$(ajukan "'K-TC01','MASUK',$ISI,5")" "BERHASIL"
periksa "saldo 10+5" "$(saldo)" "15"
periksa "movement K-TC01" "$(mv K-TC01)" "1"

echo; echo "=== TC-02 Kunci sama, isi sama ==="
periksa "kode ulang" "$(ajukan "'K-TC01','MASUK',$ISI,5")" "SUDAH_DIPROSES"
periksa "saldo tetap" "$(saldo)" "15"
periksa "movement tetap" "$(mv K-TC01)" "1"
periksa "hasil sebelumnya dikembalikan (movement_id sama)" \
  "$(sql "SELECT movement_id FROM ajukan_kejadian('K-TC01','MASUK',$ISI,5);")" \
  "$(sql "SELECT id FROM stock_movement WHERE kunci='K-TC01';")"

echo; echo "=== TC-03 Kunci sama, isi berbeda ==="
periksa "jumlah 7" "$(ajukan "'K-TC01','MASUK',$ISI,7")" "KONFLIK"
periksa "batch lain" "$(ajukan "'K-TC01','MASUK','A','NUGGET','B2311B','2027-05-30',5")" "KONFLIK"
periksa "jenis lain" "$(ajukan "'K-TC01','KELUAR',$ISI,5")" "KONFLIK"
periksa "saldo tetap" "$(saldo)" "15"
periksa "movement tetap" "$(mv K-TC01)" "1"

echo; echo "=== TC-04 Produk nonaktif ==="
periksa "kode" "$(ajukan "'K-TC04','MASUK','A','SOSIS','S01','2027-01-01',5")" "DITOLAK"
periksa "kunci tidak tersimpan" "$(ada_kunci K-TC04)" "0"
periksa "tidak ada movement" "$(mv K-TC04)" "0"
sql "UPDATE produk SET aktif=true WHERE id='SOSIS';" >/dev/null
periksa "I-4: diperbaiki lalu diajukan ulang kunci sama" "$(ajukan "'K-TC04','MASUK','A','SOSIS','S01','2027-01-01',5")" "BERHASIL"
periksa "movement setelah I-4" "$(mv K-TC04)" "1"

echo; echo "=== TC-05 Stok tidak mencukupi ==="
reset
periksa "keluar 11 dari 10" "$(ajukan "'K-TC05','KELUAR',$ISI,11")" "DITOLAK"
periksa "saldo tetap" "$(saldo)" "10"
periksa "kunci tidak tersimpan" "$(ada_kunci K-TC05)" "0"
periksa "batch tidak ada" "$(ajukan "'K-TC05b','KELUAR','A','NUGGET','TIDAKADA','2027-05-30',1")" "DITOLAK"
periksa "baris saldo tidak dibuat untuk batch tidak ada" "$(sql "SELECT count(*) FROM saldo_batch WHERE batch='TIDAKADA';")" "0"

echo; echo "=== TC-06 Jumlah nol atau negatif ==="
periksa "jumlah 0" "$(ajukan "'K-TC06a','MASUK',$ISI,0")" "DITOLAK"
periksa "jumlah -3" "$(ajukan "'K-TC06b','MASUK',$ISI,-3")" "DITOLAK"
periksa "jumlah NULL" "$(ajukan "'K-TC06c','MASUK',$ISI,NULL")" "DITOLAK"
periksa "saldo tetap" "$(saldo)" "10"
periksa "tidak ada kunci tersimpan" "$(sql "SELECT count(*) FROM kunci_kejadian WHERE kunci LIKE 'K-TC06%';")" "0"

echo; echo "=== TC-07 Jenis kejadian tidak valid ==="
periksa "jenis 'masuk' (huruf kecil)" "$(ajukan "'K-TC07a','masuk',$ISI,5")" "DITOLAK"
periksa "jenis 'TRANSFER'" "$(ajukan "'K-TC07b','TRANSFER',$ISI,5")" "DITOLAK"
periksa "jenis NULL" "$(ajukan "'K-TC07c',NULL,$ISI,5")" "DITOLAK"
periksa "kunci NULL" "$(ajukan "NULL,'MASUK',$ISI,5")" "DITOLAK"
periksa "saldo tetap" "$(saldo)" "10"

echo; echo "=== TC-08 Dua sesi bersamaan, kunci sama, isi sama ==="
reset; buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC08','MASUK',$ISI,5);"
sleep 0.5
kirim B "SELECT kode FROM ajukan_kejadian('K-TC08','MASUK',$ISI,5);"
periksa "sesi B menunggu lock selama A belum commit" "$(status_sesi B)" "Lock"
periksa "saldo terlihat dari luar sebelum commit A" "$(saldo)" "10"
kirim A "COMMIT;"; sleep 0.8
periksa "sesi A" "$(hasil A)" "BERHASIL"
periksa "sesi B setelah A commit" "$(hasil B)" "SUDAH_DIPROSES"
tutup A; tutup B
periksa "saldo 10+5 sekali" "$(saldo)" "15"
periksa "movement K-TC08" "$(mv K-TC08)" "1"

echo; echo "=== TC-09 Dua sesi bersamaan, kunci sama, isi berbeda (5 vs 7) ==="
reset; buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC09','MASUK',$ISI,5);"
sleep 0.5
kirim B "SELECT kode FROM ajukan_kejadian('K-TC09','MASUK',$ISI,7);"
periksa "sesi B menunggu lock" "$(status_sesi B)" "Lock"
kirim A "COMMIT;"; sleep 0.8
periksa "sesi A" "$(hasil A)" "BERHASIL"
periksa "sesi B" "$(hasil B)" "KONFLIK"
tutup A; tutup B
periksa "saldo 10+5 (isi A)" "$(saldo)" "15"
periksa "movement K-TC09" "$(mv K-TC09)" "1"

echo; echo "=== TC-10 Sesi A rollback, sesi B mencoba kunci sama ==="
reset; buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC10','MASUK',$ISI,5);"
sleep 0.5
kirim B "SELECT kode FROM ajukan_kejadian('K-TC10','MASUK',$ISI,5);"
periksa "sesi B menunggu lock" "$(status_sesi B)" "Lock"
kirim A "ROLLBACK;"; sleep 0.8
periksa "sesi A (sebelum rollback)" "$(hasil A)" "BERHASIL"
periksa "sesi B setelah A rollback" "$(hasil B)" "BERHASIL"
tutup A; tutup B
periksa "saldo 10+5 sekali" "$(saldo)" "15"
periksa "movement K-TC10" "$(mv K-TC10)" "1"
echo "   -- TC-10b: A ditolak bisnis tetapi transaksinya masih terbuka --"
reset; sql "UPDATE produk SET aktif=false WHERE id='NUGGET';" >/dev/null
buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC10b','MASUK',$ISI,5);"
sleep 0.5; sql "UPDATE produk SET aktif=true WHERE id='NUGGET';" >/dev/null
kirim B "SELECT kode FROM ajukan_kejadian('K-TC10b','MASUK',$ISI,5);"
periksa "sesi B tidak menunggu (klaim A sudah dibatalkan)" "$(status_sesi B)" "Client"
periksa "sesi A" "$(hasil A)" "DITOLAK"
periksa "sesi B" "$(hasil B)" "BERHASIL"
kirim A "COMMIT;"; tutup A; tutup B
periksa "movement K-TC10b" "$(mv K-TC10b)" "1"

echo; echo "=== TC-11 Dua kunci berbeda mengubah batch sama (saldo 10, masing-masing keluar 8) ==="
reset; buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC11A','KELUAR',$ISI,8);"
sleep 0.5
kirim B "SELECT kode FROM ajukan_kejadian('K-TC11B','KELUAR',$ISI,8);"
periksa "sesi B menunggu kunci baris saldo" "$(status_sesi B)" "Lock"
kirim A "COMMIT;"; sleep 0.8
periksa "sesi A" "$(hasil A)" "BERHASIL"
periksa "sesi B membaca saldo terbaru (2)" "$(hasil B)" "DITOLAK"
tutup A; tutup B
periksa "saldo" "$(saldo)" "2"
periksa "kunci B tidak tersimpan" "$(ada_kunci K-TC11B)" "0"
echo "   -- TC-11b: A rollback, B harus berhasil --"
reset; buka A; buka B
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC11A','KELUAR',$ISI,8);"
sleep 0.5
kirim B "SELECT kode FROM ajukan_kejadian('K-TC11B','KELUAR',$ISI,8);"
periksa "sesi B menunggu" "$(status_sesi B)" "Lock"
kirim A "ROLLBACK;"; sleep 0.8
periksa "sesi B" "$(hasil B)" "BERHASIL"
tutup A; tutup B
periksa "saldo" "$(saldo)" "2"

echo; echo "=== TC-12 Koneksi terputus / hasil commit tidak diketahui ==="
echo "   -- TC-12a: koneksi sesi A diputus SEBELUM commit --"
reset; buka A
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC12a','MASUK',$ISI,5);"
sleep 0.5; $P -c "SELECT pg_terminate_backend($(pid_sesi A));" >/dev/null; tutup A
periksa "status kunci setelah putus" "$(sql "SELECT status FROM status_kunci('K-TC12a');")" "BELUM_ADA_YANG_BERHASIL"
periksa "saldo tidak berubah" "$(saldo)" "10"
periksa "kirim ulang isi sama" "$(ajukan "'K-TC12a','MASUK',$ISI,5")" "BERHASIL"
periksa "movement" "$(mv K-TC12a)" "1"
echo "   -- TC-12b: COMMIT terjadi tetapi klien tidak membaca jawabannya --"
reset; buka A
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC12b','MASUK',$ISI,5); COMMIT;"
sleep 0.8; tutup A   # keluaran sesi A sengaja tidak dibaca
periksa "status kunci" "$(sql "SELECT status FROM status_kunci('K-TC12b');")" "BERHASIL"
periksa "sidik tersimpan = sidik isi klien" \
  "$(sql "SELECT sidik FROM status_kunci('K-TC12b');")" \
  "$(sql "SELECT sidik_isi(isi_kanonik('MASUK',$ISI,5));")"
periksa "kirim ulang isi sama" "$(ajukan "'K-TC12b','MASUK',$ISI,5")" "SUDAH_DIPROSES"
periksa "saldo 10+5 sekali" "$(saldo)" "15"
periksa "movement" "$(mv K-TC12b)" "1"

echo; echo "=== TC-13 (regresi) Isolasi REPEATABLE READ ditolak tegas ==="
reset
periksa "pesan" "$($P -c "SET search_path=uji_idem; BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT kode FROM ajukan_kejadian('K-TC13','MASUK',$ISI,5); COMMIT;" 2>&1 | grep -o 'wajib dijalankan pada READ COMMITTED' | head -1)" "wajib dijalankan pada READ COMMITTED"
periksa "saldo tetap" "$(saldo)" "10"

echo; echo "=== TC-14 (regresi) DateStyle berbeda tidak membuat konflik palsu ==="
ajukan "'K-TC14','MASUK',$ISI,5" >/dev/null
periksa "kirim ulang dengan DateStyle SQL,DMY" "$($P -c "SET DateStyle='SQL, DMY'; SET search_path=uji_idem; SELECT kode FROM ajukan_kejadian('K-TC14','MASUK',$ISI,5);")" "SUDAH_DIPROSES"

echo; echo "=== TC-15 (regresi) Karakter pemisah tidak membuat sidik bertabrakan ==="
ajukan "'K-TC15','MASUK','A','A|B','C','2027-05-30',1" >/dev/null
periksa "produk 'A' batch 'B|C' dengan kunci sama" "$(ajukan "'K-TC15','MASUK','A','A','B|C','2027-05-30',1")" "KONFLIK"

echo; echo "=== TC-16 (regresi) Batas waktu tunggu, lalu kirim ulang ==="
reset; buka A
kirim A "BEGIN; SELECT kode FROM ajukan_kejadian('K-TC16','MASUK',$ISI,5);"
sleep 0.5
periksa "sesi kedua dengan lock_timeout 1s" "$($P -c "SET lock_timeout='1s'; SET search_path=uji_idem; SELECT kode FROM ajukan_kejadian('K-TC16','MASUK',$ISI,5);" 2>&1 | grep -o 'lock timeout' | head -1)" "lock timeout"
kirim A "COMMIT;"; sleep 0.5; tutup A
periksa "kirim ulang setelah A commit" "$(ajukan "'K-TC16','MASUK',$ISI,5")" "SUDAH_DIPROSES"
periksa "movement" "$(mv K-TC16)" "1"

echo; echo "=== Verifikasi akhir (data TC-16) ==="
$P -f "$DIR/verifikasi.sql"
PEL=$($P -c "SET search_path=uji_idem;
 SELECT (SELECT count(*) FROM kunci_kejadian k WHERE NOT EXISTS (SELECT 1 FROM stock_movement m WHERE m.kunci=k.kunci))
      + (SELECT count(*) FROM (SELECT 1 FROM stock_movement GROUP BY kunci,baris HAVING count(*)>1) x)
      + (SELECT count(*) FROM saldo_batch WHERE jumlah<0)
      + (SELECT count(*) FROM kunci_kejadian WHERE sidik_isi<>sidik_isi(isi))
      + (SELECT count(*) FROM (SELECT s.jumlah FROM saldo_batch s LEFT JOIN stock_movement m
           ON (m.cabang,m.produk,m.batch,m.kedaluwarsa)=(s.cabang,s.produk,s.batch,s.kedaluwarsa)
           GROUP BY s.cabang,s.produk,s.batch,s.kedaluwarsa,s.jumlah HAVING s.jumlah<>coalesce(sum(m.perubahan),0)) y);")
periksa "jumlah pelanggaran V3+V4+V5+V6+V7" "$PEL" "0"

echo; echo "=== RINGKASAN: $LULUS PASS, $GAGAL FAIL ==="
