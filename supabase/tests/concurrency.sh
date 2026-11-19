#!/usr/bin/env bash
# Uji konkurensi (I-1): dua transaksi menurunkan stok produk yang sama secara bersamaan
# tidak boleh saling membatalkan. Jalankan SETELAH run.sh pada DB lokal: PGDATABASE=asri_test supabase/tests/concurrency.sh
set -euo pipefail
Q="psql -v ON_ERROR_STOP=1 -q -At"
$Q <<'SQL'
delete from batches where kode_batch in ('CR0','CR1'); delete from purchase_suggestions where product_id='44444444-0000-0000-0000-000000000001';
delete from products where id='44444444-0000-0000-0000-000000000001'; delete from storage_locations where id='44444444-0000-0000-0000-0000000000f1';
insert into storage_locations(id,nama,tipe) values ('44444444-0000-0000-0000-0000000000f1','Lok konkurensi','freezer');
insert into products(id,sku,nama,min_stock,reorder_qty) values ('44444444-0000-0000-0000-000000000001','CONC','Produk konkurensi',5,10);
insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa) values
 ('44444444-0000-0000-0000-000000000001','44444444-0000-0000-0000-0000000000f1','CR0',3,current_date+90),
 ('44444444-0000-0000-0000-000000000001','44444444-0000-0000-0000-0000000000f1','CR1',3,current_date+90);
delete from purchase_suggestions where product_id='44444444-0000-0000-0000-000000000001';
SQL
( $Q -c "begin; update batches set qty=0 where kode_batch='CR0'; select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.7
if $Q -c "update batches set qty=0 where kode_batch='CR1'" >/dev/null 2>/tmp/conc_err; then R=ok; else R=gagal; fi
wait
N=$($Q -c "select count(*) from purchase_suggestions where product_id='44444444-0000-0000-0000-000000000001' and status='terbuka'")
$Q <<'SQL'
delete from batches where kode_batch in ('CR0','CR1'); delete from purchase_suggestions where product_id='44444444-0000-0000-0000-000000000001';
delete from products where id='44444444-0000-0000-0000-000000000001'; delete from storage_locations where id='44444444-0000-0000-0000-0000000000f1';
SQL
if [ "$R" = ok ] && [ "$N" = 1 ]; then echo "UJI KONKURENSI LULUS"; else echo "GAGAL konkurensi: transaksi2=$R saran_terbuka=$N"; cat /tmp/conc_err; exit 1; fi
