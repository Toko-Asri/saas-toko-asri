#!/usr/bin/env bash
# Uji konkurensi CRM pada Postgres LOKAL (setelah run.sh): PGDATABASE=asri_test supabase/tests/crm_concurrency.sh
#  1) dua kasir menjual ke pelanggan yang sama bersamaan -> hitungan pelanggan = jumlah semua transaksi
#  2) kunci idempotensi SAMA dikirim bersamaan untuk pelanggan yang sama -> poin diberikan sekali
set -euo pipefail
Q="psql -v ON_ERROR_STOP=1 -q -At"
P=dddddddd-0000-0000-0000-000000000001
C=dddddddd-0000-0000-0000-0000000000c1
K1=44444444-4444-4444-4444-444444444441
K2=44444444-4444-4444-4444-444444444442
KS=44444444-4444-4444-4444-444444444443
A1=dddddddd-0000-0000-0000-0000000000a1
A2=dddddddd-0000-0000-0000-0000000000a2
bersih() { $Q <<SQL
delete from sale_items where product_id='$P'; delete from sales where idempotency_key in ('$K1','$K2','$KS');
delete from batches where product_id='$P'; delete from purchase_suggestions where product_id='$P';
delete from products where id='$P'; delete from customers where id='$C';
delete from storage_locations where id='dddddddd-0000-0000-0000-0000000000f1';
delete from profiles where id in ('$A1','$A2'); delete from auth.users where id in ('$A1','$A2');
SQL
}
trap bersih EXIT
bersih
$Q <<SQL
insert into auth.users(id) values ('$A1'),('$A2');
insert into profiles(id,nama,peran) values ('$A1','K1','kasir'),('$A2','K2','kasir');
insert into storage_locations(id,nama,tipe) values ('dddddddd-0000-0000-0000-0000000000f1','Lok CRM conc','freezer');
insert into products(id,sku,nama,min_stock,reorder_qty,harga_beli,harga_jual) values ('$P','CRMC','Produk konkurensi CRM',0,10,9000,15000);
insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values ('$P','dddddddd-0000-0000-0000-0000000000f1','CC1',100,current_date+60,9000);
insert into customers(id,nama,telepon) values ('$C','Pelanggan konkurensi','62899888777');
SQL
ITEM="[{\"product_id\":\"$P\",\"qty\":2}]"   # 2 x 15000 = 30000 = 3 poin

# --- 1) dua kasir, pelanggan sama, kunci berbeda
( $Q -c "select set_config('request.jwt.claim.sub','$A1',false); begin; select checkout('$ITEM'::jsonb,'tunai',30000,'$K1','$C'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.7
$Q -c "select set_config('request.jwt.claim.sub','$A2',false); select checkout('$ITEM'::jsonb,'tunai',30000,'$K2','$C');" >/dev/null
wait
HASIL=$($Q -c "select poin||'/'||total_belanja||'/'||jumlah_transaksi from customers where id='$C'")
if [ "$HASIL" != "6/60000/2" ]; then echo "GAGAL dua kasir: pelanggan=$HASIL (harapan 6/60000/2)"; exit 1; fi

# --- 2) kunci sama bersamaan
$Q -c "update customers set poin=0, total_belanja=0, jumlah_transaksi=0 where id='$C'" >/dev/null
( $Q -c "select set_config('request.jwt.claim.sub','$A1',false); begin; select checkout('$ITEM'::jsonb,'tunai',30000,'$KS','$C'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.7
$Q -c "select set_config('request.jwt.claim.sub','$A1',false); select checkout('$ITEM'::jsonb,'tunai',30000,'$KS','$C');" >/dev/null
wait
HASIL=$($Q -c "select poin||'/'||total_belanja||'/'||jumlah_transaksi from customers where id='$C'")
SALES=$($Q -c "select count(*) from sales where idempotency_key='$KS'")
if [ "$HASIL" != "3/30000/1" ] || [ "$SALES" != 1 ]; then echo "GAGAL kunci sama: pelanggan=$HASIL transaksi=$SALES (harapan 3/30000/1 dan 1)"; exit 1; fi
echo "UJI KONKURENSI CRM LULUS"
