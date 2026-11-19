#!/usr/bin/env bash
# Uji konkurensi ERP pada Postgres LOKAL (setelah run.sh): PGDATABASE=asri_test supabase/tests/erp_concurrency.sh
#  1) dua kasir menjual unit terakhir bersamaan -> satu sukses, satu ditolak, stok tidak negatif
#  2) dua pengiriman dengan kunci idempotensi SAMA bersamaan -> satu transaksi, stok berkurang sekali
set -euo pipefail
Q="psql -v ON_ERROR_STOP=1 -q -At"
P=cccccccc-0000-0000-0000-000000000001
K1=11111111-1111-1111-1111-111111111111
K2=22222222-2222-2222-2222-222222222222
KS=33333333-3333-3333-3333-333333333333
bersih() { $Q <<SQL
delete from sale_items where product_id='$P'; delete from sales where idempotency_key in ('$K1','$K2','$KS');
delete from batches where product_id='$P'; delete from purchase_suggestions where product_id='$P';
delete from products where id='$P'; delete from storage_locations where id='cccccccc-0000-0000-0000-0000000000f1';
delete from profiles where id in ('cccccccc-0000-0000-0000-0000000000a1','cccccccc-0000-0000-0000-0000000000a2');
delete from auth.users where id in ('cccccccc-0000-0000-0000-0000000000a1','cccccccc-0000-0000-0000-0000000000a2');
SQL
}
trap bersih EXIT
bersih
$Q <<SQL
insert into auth.users(id) values ('cccccccc-0000-0000-0000-0000000000a1'),('cccccccc-0000-0000-0000-0000000000a2');
insert into profiles(id,nama,peran) values ('cccccccc-0000-0000-0000-0000000000a1','K1','kasir'),('cccccccc-0000-0000-0000-0000000000a2','K2','kasir');
insert into storage_locations(id,nama,tipe) values ('cccccccc-0000-0000-0000-0000000000f1','Lok ERP conc','freezer');
insert into products(id,sku,nama,min_stock,reorder_qty,harga_beli,harga_jual) values ('$P','CONCE','Produk konkurensi ERP',0,10,5000,9000);
insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values ('$P','cccccccc-0000-0000-0000-0000000000f1','CE1',1,current_date+30,5000);
SQL
ITEM1="[{\"product_id\":\"$P\",\"qty\":1}]"

# --- 1) unit terakhir diperebutkan dua kasir
( $Q -c "select set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-0000000000a1',false); begin; select checkout('$ITEM1'::jsonb,'tunai',9000,'$K1'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.7
if $Q -c "select set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-0000000000a2',false); select checkout('$ITEM1'::jsonb,'tunai',9000,'$K2');" >/dev/null 2>/tmp/erp_conc_err; then R2=sukses; else R2=ditolak; fi
wait
SALES=$($Q -c "select count(*) from sales where idempotency_key in ('$K1','$K2')")
STOK=$($Q -c "select sum(qty) from batches where product_id='$P'")
if [ "$R2" != ditolak ] || [ "$SALES" != 1 ] || [ "$STOK" != 0 ] || ! grep -q "tidak cukup" /tmp/erp_conc_err; then
  echo "GAGAL unit terakhir: kasir2=$R2 transaksi=$SALES stok=$STOK"; cat /tmp/erp_conc_err; exit 1
fi

# --- 2) kunci idempotensi sama, dikirim bersamaan
$Q -c "update batches set qty = 5 where product_id='$P'" >/dev/null
ITEM2="[{\"product_id\":\"$P\",\"qty\":2}]"
( $Q -c "select set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-0000000000a1',false); begin; select checkout('$ITEM2'::jsonb,'tunai',18000,'$KS'); select pg_sleep(2); commit;" >/dev/null ) &
sleep 0.7
if $Q -c "select set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-0000000000a1',false); select checkout('$ITEM2'::jsonb,'tunai',18000,'$KS');" >/dev/null 2>/tmp/erp_conc_err; then RS=sukses; else RS=gagal; fi
wait
SALES=$($Q -c "select count(*) from sales where idempotency_key='$KS'")
STOK=$($Q -c "select sum(qty) from batches where product_id='$P'")
if [ "$RS" != sukses ] || [ "$SALES" != 1 ] || [ "$STOK" != 3 ]; then
  echo "GAGAL kunci sama: kirim2=$RS transaksi=$SALES stok=$STOK (harapan 1 dan 3)"; cat /tmp/erp_conc_err; exit 1
fi
echo "UJI KONKURENSI ERP LULUS"
