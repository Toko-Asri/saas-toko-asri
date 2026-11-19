-- Uji skema SCM. Jalankan: psql -v ON_ERROR_STOP=1 -d asri_test -f supabase/tests/scm_test.sql
-- Catatan: asumsikan DB bersih (skema baru, tanpa seed); lihat supabase/tests/run.sh.
-- Semua perubahan di-rollback di akhir.
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
grant execute on all functions in schema tst to authenticated;

-- fixture
insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2'),('00000000-0000-0000-0000-0000000000a3');
insert into profiles(id,nama,peran) values
  ('00000000-0000-0000-0000-0000000000a1','Gudang','staf_gudang'),
  ('00000000-0000-0000-0000-0000000000a2','Kasir','kasir'),
  ('00000000-0000-0000-0000-0000000000a3','Pemilik','pemilik');
insert into suppliers(id,nama) values ('11111111-0000-0000-0000-000000000001','Pemasok Uji');
insert into storage_locations(id,nama,tipe,suhu_min,suhu_maks) values ('22222222-0000-0000-0000-000000000001','Freezer Uji','freezer',-22,-18);
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('33333333-0000-0000-0000-000000000001','P1','Produk 1','pcs','11111111-0000-0000-0000-000000000001',1000,1500,10,50),
  ('33333333-0000-0000-0000-000000000002','P2','Produk 2','pcs','11111111-0000-0000-0000-000000000001',1000,1500,10,40),
  ('33333333-0000-0000-0000-000000000003','P3','Produk 3 tanpa pemasok','pcs',null,1000,1500,10,40);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);

-- (a) PO tanpa item / qty <= 0 ditolak
select tst.expect_error($q$select create_po('11111111-0000-0000-0000-000000000001','[]'::jsonb)$q$, 'PO tanpa item');
select tst.expect_error($q$select create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":0,"harga_beli":1000}]'::jsonb)$q$, 'qty 0');
select tst.expect_error($q$select create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":-3,"harga_beli":1000}]'::jsonb)$q$, 'qty negatif');

-- (b) penerimaan penuh + (b0) PO draft tidak bisa diterima
do $$ declare po uuid; it uuid; begin
  po := create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":20,"harga_beli":1000}]'::jsonb);
  select id into it from purchase_order_items where po_id = po;
  perform tst.expect_error(format($f$select receive_goods(%L,%L::jsonb)$f$, po,
    format('[{"item_id":"%s","qty":20,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"B1","tgl_kedaluwarsa":"2099-01-01"}]', it)), 'terima PO draft');
  perform set_po_status(po,'dipesan');
  perform receive_goods(po, format('[{"item_id":"%s","qty":20,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"B1","tgl_kedaluwarsa":"2099-01-01"}]', it)::jsonb);
  perform tst.assert((select sum(qty) from batches where product_id='33333333-0000-0000-0000-000000000001') = 20, 'batch 20 terbentuk');
  perform tst.assert((select status from purchase_orders where id=po) = 'diterima', 'PO diterima');
  -- (c) terima ulang ditolak, stok tidak berubah
  perform tst.expect_error(format($f$select receive_goods(%L,%L::jsonb)$f$, po,
    format('[{"item_id":"%s","qty":1,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"B1b","tgl_kedaluwarsa":"2099-01-01"}]', it)), 'terima ulang');
  perform tst.assert((select sum(qty) from batches where product_id='33333333-0000-0000-0000-000000000001') = 20, 'stok tetap 20');
end $$;

-- (d) melebihi pesanan ditolak; penerimaan parsial menjaga status dipesan
do $$ declare po uuid; it uuid; loc text := '22222222-0000-0000-0000-000000000001'; begin
  po := create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000002","qty":5,"harga_beli":1000}]'::jsonb);
  select id into it from purchase_order_items where po_id = po;
  perform set_po_status(po,'dipesan');
  perform tst.expect_error(format($f$select receive_goods(%L,%L::jsonb)$f$, po,
    format('[{"item_id":"%s","qty":6,"location_id":"%s","kode_batch":"X","tgl_kedaluwarsa":"2099-01-01"}]', it, loc)), 'lebih dari pesanan');
  perform receive_goods(po, format('[{"item_id":"%s","qty":3,"location_id":"%s","kode_batch":"X1","tgl_kedaluwarsa":"2099-01-01"}]', it, loc)::jsonb);
  perform tst.assert((select status from purchase_orders where id=po) = 'dipesan', 'parsial tetap dipesan');
  perform receive_goods(po, format('[{"item_id":"%s","qty":2,"location_id":"%s","kode_batch":"X2","tgl_kedaluwarsa":"2099-01-01"}]', it, loc)::jsonb);
  perform tst.assert((select status from purchase_orders where id=po) = 'diterima', 'sisa diterima');
end $$;

-- (e) saran pembelian: stok tepat = min_stock memicu satu saran; tidak duplikat; tertutup saat stok cukup
delete from batches where product_id='33333333-0000-0000-0000-000000000002';
do $$ begin
  insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa) values ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','S1',10,current_date+30);
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000002' and status='terbuka') = 1, 'tepat satu saran saat stok = min');
  perform tst.assert((select qty_disarankan from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000002' and status='terbuka') = 40, 'qty saran = reorder_qty');
  update batches set qty = 10 where kode_batch='S1';
  update batches set qty = qty where product_id='33333333-0000-0000-0000-000000000002';
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000002' and status='terbuka') = 1, 'tidak duplikat');
  insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa) values ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','S2',1,current_date+30);
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000002' and status='terbuka') = 0, 'saran tertutup saat stok > min');
end $$;

-- (f) produk baru tanpa stok langsung disarankan
do $$ begin
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000003' and status='terbuka') = 1, 'produk stok 0 disarankan');
end $$;

-- (g) buat PO dari saran
do $$ declare sid uuid; po uuid; begin
  select id into sid from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000001' and status='terbuka';
  if sid is null then
    update batches set qty = 5 where product_id='33333333-0000-0000-0000-000000000001';
    select id into sid from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000001' and status='terbuka';
  end if;
  perform tst.assert(sid is not null, 'ada saran P1');
  po := create_po_from_suggestion(sid);
  perform tst.assert((select status from purchase_suggestions where id=sid) = 'dipesan', 'saran ditandai dipesan');
  perform tst.assert((select qty_pesan from purchase_order_items where po_id=po) = 50, 'qty item = saran');
  update batches set qty = qty where product_id='33333333-0000-0000-0000-000000000001';
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000001' and status='terbuka') = 0, 'tidak ada saran baru selama PO berjalan');
  -- tanpa pemasok -> ditolak
  perform tst.expect_error(format($f$select create_po_from_suggestion(%L)$f$, (select id from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000003' and status='terbuka')), 'saran tanpa pemasok');
end $$;


-- (j) pembatalan PO: saran kembali terbuka; PO yang sudah menerima barang tidak bisa dibatalkan
do $$ declare sid uuid; po uuid; po2 uuid; it uuid; begin
  select id into sid from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000001' and status='dipesan';
  select po_id into po from purchase_suggestions where id = sid;
  perform set_po_status(po,'dibatalkan');
  perform tst.assert((select status from purchase_suggestions where id=sid) = 'terbuka', 'saran kembali terbuka setelah PO batal');
  perform tst.assert((select po_id from purchase_suggestions where id=sid) is null, 'po_id saran dikosongkan');
  po2 := create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":9,"harga_beli":1000}]'::jsonb);
  select id into it from purchase_order_items where po_id = po2;
  perform set_po_status(po2,'dipesan');
  perform receive_goods(po2, format('[{"item_id":"%s","qty":2,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"PB1","tgl_kedaluwarsa":"2099-01-01"}]', it)::jsonb);
  perform tst.expect_error(format($f$select set_po_status(%L,'dibatalkan')$f$, po2), 'batal PO yang sudah menerima barang');
end $$;

-- (k) I-2: setelah PO dari saran diterima tapi stok masih <= min, saran baru langsung muncul
do $$ declare sid uuid; po uuid; it uuid; begin
  insert into products(id,sku,nama,satuan,supplier_id,min_stock,reorder_qty) values ('33333333-0000-0000-0000-000000000004','P4','Produk 4','pcs','11111111-0000-0000-0000-000000000001',30,10);
  select id into sid from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000004' and status='terbuka';
  po := create_po_from_suggestion(sid);
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform receive_goods(po, format('[{"item_id":"%s","qty":10,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"K1","tgl_kedaluwarsa":"2099-01-01"}]', it)::jsonb);
  perform tst.assert((select count(*) from purchase_suggestions where product_id='33333333-0000-0000-0000-000000000004' and status='terbuka') = 1, 'stok 10 <= min 30 setelah terima: saran baru terbuka');
end $$;

-- (l) I-3: kedaluwarsa hari ini (tanggal Jakarta) ditolak saat penerimaan
do $$ declare po uuid; it uuid; begin
  po := create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":3,"harga_beli":1000}]'::jsonb);
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform tst.expect_error(format($f$select receive_goods(%L,%L::jsonb)$f$, po,
    format('[{"item_id":"%s","qty":1,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"L1","tgl_kedaluwarsa":"%s"}]', it, (now() at time zone 'Asia/Jakarta')::date)), 'kedaluwarsa hari ini');
  perform receive_goods(po, format('[{"item_id":"%s","qty":1,"location_id":"22222222-0000-0000-0000-000000000001","kode_batch":"L2","tgl_kedaluwarsa":"%s"}]', it, (now() at time zone 'Asia/Jakarta')::date + 1)::jsonb);
end $$;

-- (m) I-4: aturan status PO dan penerimaan tidak bisa dilewati lewat tulis tabel langsung
do $$ declare po uuid; it uuid; begin
  po := create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":4,"harga_beli":1000}]'::jsonb);
  select id into it from purchase_order_items where po_id = po;
  perform tst.expect_error(format($f$update purchase_orders set status='dipesan' where id=%L$f$, po), 'update status langsung');
  perform tst.expect_error(format($f$update purchase_order_items set qty_diterima=qty_pesan where id=%L$f$, it), 'qty_diterima langsung');
  perform tst.expect_error(format($f$select set_po_status(%L,'diterima')$f$, po), 'draft -> diterima');
  perform set_po_status(po,'dibatalkan');
  perform tst.expect_error(format($f$select set_po_status(%L,'dipesan')$f$, po), 'dibatalkan -> dipesan');
end $$;

-- (h) RLS: kasir
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a2',true);
select tst.expect_error($q$insert into suppliers(nama) values ('X')$q$, 'kasir tulis pemasok');
select tst.expect_error($q$select receive_goods('11111111-0000-0000-0000-000000000009','[]'::jsonb)$q$, 'kasir receive_goods');
select tst.expect_error($q$select create_po('11111111-0000-0000-0000-000000000001','[{"product_id":"33333333-0000-0000-0000-000000000001","qty":1,"harga_beli":1}]'::jsonb)$q$, 'kasir create_po');
select tst.assert((select count(*) from batches) > 0, 'kasir boleh baca batch');
select tst.assert((select count(*) from products) = 4, 'kasir boleh baca produk');
select tst.assert((select count(*) from purchase_orders) = 0, 'kasir tidak lihat PO');

-- (i) staf gudang tidak bisa menaikkan perannya sendiri
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
update profiles set peran='pemilik' where id='00000000-0000-0000-0000-0000000000a1';
select tst.assert((select peran from profiles where id='00000000-0000-0000-0000-0000000000a1') = 'staf_gudang', 'peran tidak berubah');

reset role;
rollback;
\echo 'SEMUA UJI SCM LULUS'
