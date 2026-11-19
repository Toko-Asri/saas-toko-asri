-- Uji skema/RPC ERP. Dijalankan oleh run.sh setelah scm_test.sql pada DB bersih. Semua di-rollback.
begin;
create schema tst;
grant usage on schema tst to authenticated;
create function tst.assert(cond boolean, msg text) returns void language plpgsql as
$$ begin if cond is not true then raise exception 'GAGAL: %', msg; end if; end $$;
create function tst.expect_error(q text, msg text) returns void language plpgsql as
$$ begin
  begin execute q; exception when others then return; end;
  raise exception 'GAGAL (seharusnya error): %', msg;
end $$;
create function tst.as_user(u uuid) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u::text, true); end $$;
grant execute on all functions in schema tst to authenticated;

-- fixture
insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000e1'),('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000e3'),('00000000-0000-0000-0000-0000000000e4');
insert into profiles(id,nama,peran) values
  ('00000000-0000-0000-0000-0000000000e1','Kasir A','kasir'),
  ('00000000-0000-0000-0000-0000000000e2','Kasir B','kasir'),
  ('00000000-0000-0000-0000-0000000000e3','Gudang','staf_gudang'),
  ('00000000-0000-0000-0000-0000000000e4','Pemilik','pemilik');
insert into suppliers(id,nama) values ('55555555-0000-0000-0000-000000000001','Pemasok ERP');
insert into storage_locations(id,nama,tipe) values ('66666666-0000-0000-0000-000000000001','Freezer ERP','freezer');
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('77777777-0000-0000-0000-000000000001','E1','Produk ERP','pcs','55555555-0000-0000-0000-000000000001',6000,10000,0,10);

-- (1) receive_goods v2 menyimpan biaya per batch dari harga item PO
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
set local role authenticated;
do $$ declare po uuid; it uuid; begin
  po := create_po('55555555-0000-0000-0000-000000000001','[{"product_id":"77777777-0000-0000-0000-000000000001","qty":5,"harga_beli":5500}]'::jsonb);
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform receive_goods(po, format('[{"item_id":"%s","qty":5,"location_id":"66666666-0000-0000-0000-000000000001","kode_batch":"ERP-R1","tgl_kedaluwarsa":"2099-01-01"}]', it)::jsonb);
  perform tst.assert((select harga_beli from batches where kode_batch='ERP-R1') = 5500, 'batch menyimpan harga_beli dari item PO');
end $$;
reset role;

-- (2) view stok_layak: kedaluwarsa hari ini (WIB) tidak dihitung, besok dihitung
insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa) values
  ('77777777-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','ERP-HARIINI',7,(now() at time zone 'Asia/Jakarta')::date),
  ('77777777-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','ERP-BESOK',3,(now() at time zone 'Asia/Jakarta')::date + 1);
select tst.assert((select stok from stok_layak where product_id='77777777-0000-0000-0000-000000000001') = 8, 'stok layak = 5 (2099) + 3 (besok), tanpa 7 yang kedaluwarsa hari ini');

-- (3) RLS penjualan: kasir hanya miliknya, gudang tidak melihat, pemilik semua
insert into sales(id,kasir_id,metode,total,bayar,kembalian,idempotency_key) values
  ('88888888-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e1','tunai',10000,10000,0,gen_random_uuid()),
  ('88888888-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000e2','tunai',20000,20000,0,gen_random_uuid());
insert into sale_items(sale_id,product_id,batch_id,qty,harga_jual,hpp_satuan)
  select '88888888-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001',id,1,10000,5500 from batches where kode_batch='ERP-R1';
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e1');
select tst.assert((select count(*) from sales) = 1, 'kasir A hanya melihat penjualannya');
select tst.assert((select count(*) from sale_items) = 1, 'kasir A melihat item penjualannya');
select tst.as_user('00000000-0000-0000-0000-0000000000e2');
select tst.assert((select count(*) from sales) = 1 and (select count(*) from sale_items) = 0, 'kasir B hanya melihat miliknya, tanpa item A');
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
select tst.assert((select count(*) from sales) = 0, 'staf gudang tidak melihat penjualan');
select tst.as_user('00000000-0000-0000-0000-0000000000e4');
select tst.assert((select count(*) from sales) = 2, 'pemilik melihat semua');

-- (4) tulis langsung ditolak untuk semua tabel ERP
select tst.expect_error($q$insert into sales(metode,total,bayar,kembalian,idempotency_key) values ('tunai',1,1,0,gen_random_uuid())$q$, 'insert sales langsung');
select tst.expect_error($q$update sales set total = 1$q$, 'update sales langsung');
select tst.expect_error($q$delete from sale_items$q$, 'delete sale_items langsung');
select tst.expect_error($q$insert into stock_adjustments(batch_id,product_id,qty_sebelum,qty_sesudah,alasan) select id,product_id,qty,0,'rusak' from batches limit 1$q$, 'insert adjustment langsung');
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
select tst.assert((select count(*) from stock_adjustments) = 0, 'staf gudang boleh membaca penyesuaian (kosong)');
reset role;

rollback;
\echo 'SEMUA UJI ERP LULUS'
