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


-- ===== Task 2: checkout (FEFO, atomik, idempoten) =====
insert into suppliers(id,nama) values ('55555555-0000-0000-0000-000000000002','Pemasok C');
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('99999999-0000-0000-0000-000000000001','PC','Produk C','pcs','55555555-0000-0000-0000-000000000002',6000,10000,5,20),
  ('99999999-0000-0000-0000-000000000002','PD','Produk D','pcs','55555555-0000-0000-0000-000000000002',6000,10000,5,20),
  ('99999999-0000-0000-0000-000000000003','PX','Produk Nonaktif','pcs','55555555-0000-0000-0000-000000000002',1,10,0,1);
update products set aktif = false where id = '99999999-0000-0000-0000-000000000003';
insert into batches(id,product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values
  ('aaaaaaaa-0000-0000-0000-00000000000a','99999999-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','CA',3,(now() at time zone 'Asia/Jakarta')::date+5,5000),
  ('aaaaaaaa-0000-0000-0000-00000000000b','99999999-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','CB',10,(now() at time zone 'Asia/Jakarta')::date+30,6000),
  ('aaaaaaaa-0000-0000-0000-00000000000c','99999999-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','CC',50,(now() at time zone 'Asia/Jakarta')::date,1),
  ('aaaaaaaa-0000-0000-0000-00000000000d','99999999-0000-0000-0000-000000000002','66666666-0000-0000-0000-000000000001','DA',8,(now() at time zone 'Asia/Jakarta')::date+30,6000);
delete from purchase_suggestions where product_id in ('99999999-0000-0000-0000-000000000001','99999999-0000-0000-0000-000000000002');

set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e1');

-- (a) FEFO lintas batch, batch kedaluwarsa hari ini tidak terpakai, HPP per batch, kembalian
do $$ declare s uuid; begin
  s := checkout('[{"product_id":"99999999-0000-0000-0000-000000000001","qty":4}]'::jsonb, 'tunai', 50000, gen_random_uuid());
  perform tst.assert((select total from sales where id=s) = 40000, 'total 40000');
  perform tst.assert((select kembalian from sales where id=s) = 10000, 'kembalian 10000');
  perform tst.assert((select count(*) from sale_items where sale_id=s) = 2, 'dua baris item (dua batch)');
  perform tst.assert((select qty from batches where kode_batch='CA' and product_id='99999999-0000-0000-0000-000000000001') = 0, 'batch A (kedaluwarsa terdekat) habis lebih dulu');
  perform tst.assert((select qty from batches where kode_batch='CB' and product_id='99999999-0000-0000-0000-000000000001') = 9, 'batch B berkurang 1');
  perform tst.assert((select qty from batches where kode_batch='CC' and product_id='99999999-0000-0000-0000-000000000001') = 50, 'batch kedaluwarsa hari ini tidak tersentuh');
  perform tst.assert((select hpp_satuan from sale_items where sale_id=s and qty=3) = 5000, 'hpp batch A 5000');
  perform tst.assert((select hpp_satuan from sale_items where sale_id=s and qty=1) = 6000, 'hpp batch B 6000');
  perform tst.assert((select kasir_id from sales where id=s) = '00000000-0000-0000-0000-0000000000e1', 'kasir tercatat');
end $$;

-- (b) melebihi stok layak ditolak dan atomik (stok layak tersisa 9; 50 unit kedaluwarsa tidak boleh menutup kekurangan)
do $$ declare n int; begin
  select count(*) into n from sales;
  perform tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000001","qty":10}]'::jsonb,'tunai',999999,gen_random_uuid())$q$, 'melebihi stok layak');
  perform tst.assert((select count(*) from sales) = n, 'tidak ada transaksi baru');
  perform tst.assert((select qty from batches where kode_batch='CB' and product_id='99999999-0000-0000-0000-000000000001') = 9, 'stok batch B tidak berubah');
  perform tst.assert((select qty from batches where kode_batch='CC' and product_id='99999999-0000-0000-0000-000000000001') = 50, 'batch kedaluwarsa tidak berubah');
  -- campuran: produk pertama cukup, produk kedua kurang -> tidak ada yang terpotong
  perform tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":2},{"product_id":"99999999-0000-0000-0000-000000000001","qty":99}]'::jsonb,'tunai',9999999,gen_random_uuid())$q$, 'keranjang campuran');
  perform tst.assert((select qty from batches where kode_batch='DA') = 8, 'produk D tidak terpotong sebagian');
end $$;

-- (c) tepat unit terakhir layak jual berhasil; setelah itu habis
do $$ declare s uuid; begin
  s := checkout('[{"product_id":"99999999-0000-0000-0000-000000000001","qty":9}]'::jsonb, 'tunai', 90000, gen_random_uuid());
  perform tst.assert((select stok from stok_layak where product_id='99999999-0000-0000-0000-000000000001') is null, 'stok layak habis');
  perform tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',10000,gen_random_uuid())$q$, 'jual lagi saat habis');
end $$;

-- (d) idempotensi + baris produk sama digabung
do $$ declare k uuid := gen_random_uuid(); s1 uuid; s2 uuid; begin
  s1 := checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1},{"product_id":"99999999-0000-0000-0000-000000000002","qty":2}]'::jsonb,'tunai',30000,k);
  s2 := checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1},{"product_id":"99999999-0000-0000-0000-000000000002","qty":2}]'::jsonb,'tunai',30000,k);
  perform tst.assert(s1 = s2, 'kunci sama mengembalikan transaksi yang sama');
  perform tst.assert((select count(*) from sales where idempotency_key=k) = 1, 'satu baris sales');
  perform tst.assert((select qty from batches where kode_batch='DA') = 5, 'stok berkurang sekali (8-3)');
  perform tst.assert((select total from sales where id=s1) = 30000, 'baris sama digabung: 3 unit');
end $$;

-- integrasi SCM: stok D = 5 = min_stock -> tepat satu saran terbuka (dibaca sebagai superuser; kasir memang tidak boleh melihat saran)
reset role;
do $$ begin
  perform tst.assert((select count(*) from purchase_suggestions where product_id='99999999-0000-0000-0000-000000000002' and status='terbuka') = 1, 'penjualan memicu saran pembelian');
end $$;

-- (e) harga snapshot saat checkout
update batches set qty = 20 where kode_batch='DA';
update products set harga_jual = 12000 where id='99999999-0000-0000-0000-000000000002';
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ declare s uuid; begin
  s := checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',12000,gen_random_uuid());
  perform tst.assert((select harga_jual from sale_items where sale_id=s) = 12000, 'memakai harga saat checkout');
  perform tst.assert((select count(*) from sale_items where harga_jual = 10000 and product_id='99999999-0000-0000-0000-000000000002') >= 1, 'baris lama tetap 10000');
end $$;

-- (f) validasi
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',11999,gen_random_uuid())$q$, 'bayar kurang dari total');
select tst.expect_error($q$select checkout('[]'::jsonb,'tunai',0,gen_random_uuid())$q$, 'keranjang kosong');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":0}]'::jsonb,'tunai',0,gen_random_uuid())$q$, 'qty 0');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":-1}]'::jsonb,'tunai',0,gen_random_uuid())$q$, 'qty negatif');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1.5}]'::jsonb,'tunai',99999,gen_random_uuid())$q$, 'qty pecahan');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":0.5},{"product_id":"99999999-0000-0000-0000-000000000002","qty":0.5}]'::jsonb,'tunai',99999,gen_random_uuid())$q$, 'pecahan yang berjumlah bulat');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000003","qty":1}]'::jsonb,'tunai',99999,gen_random_uuid())$q$, 'produk nonaktif');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'kartu',99999,gen_random_uuid())$q$, 'metode tidak valid');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'qris',15000,gen_random_uuid())$q$, 'qris bayar harus sama dengan total');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',99999,null)$q$, 'kunci kosong');
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
select tst.expect_error($q$select checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',99999,gen_random_uuid())$q$, 'staf gudang tidak boleh checkout');
select tst.as_user('00000000-0000-0000-0000-0000000000e4');
select tst.assert(checkout('[{"product_id":"99999999-0000-0000-0000-000000000002","qty":1}]'::jsonb,'qris',12000,gen_random_uuid()) is not null, 'pemilik boleh checkout');
reset role;


-- ===== Task 3: adjust_stock dan laporan =====
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('bbbbbbbb-0000-0000-0000-000000000001','PE','Produk E','pcs','55555555-0000-0000-0000-000000000002',6000,10000,0,10);
insert into batches(id,product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values
  ('bbbbbbbb-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-000000000001','66666666-0000-0000-0000-000000000001','EA',10,(now() at time zone 'Asia/Jakarta')::date+30,6000);

-- dua penjualan, lalu diberi tanggal mundur (S2 pada 00:30 WIB: UTC masih hari sebelumnya)
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e1');
select checkout('[{"product_id":"bbbbbbbb-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',20000,'c0000000-0000-0000-0000-000000000001');
select checkout('[{"product_id":"bbbbbbbb-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',10000,'c0000000-0000-0000-0000-000000000002');
reset role;
update sales set created_at = (((now() at time zone 'Asia/Jakarta')::date - 3)::text || ' 12:00:00+07')::timestamptz where idempotency_key='c0000000-0000-0000-0000-000000000001';
update sales set created_at = (((now() at time zone 'Asia/Jakarta')::date - 1)::text || ' 00:30:00+07')::timestamptz where idempotency_key='c0000000-0000-0000-0000-000000000002';
update products set min_stock = 5 where id='bbbbbbbb-0000-0000-0000-000000000001';
delete from purchase_suggestions where product_id='bbbbbbbb-0000-0000-0000-000000000001';

-- adjust_stock
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 5, 'rusak', 'pecah');
do $$ begin
  perform tst.assert((select qty from batches where id='bbbbbbbb-0000-0000-0000-00000000000a') = 5, 'stok batch menjadi 5');
  perform tst.assert((select qty_sebelum from stock_adjustments where batch_id='bbbbbbbb-0000-0000-0000-00000000000a') = 7, 'qty_sebelum 7 (10 - 3 terjual)');
  perform tst.assert((select nilai from stock_adjustments where batch_id='bbbbbbbb-0000-0000-0000-00000000000a') = 12000, 'nilai kerugian 2 x 6000');
end $$;
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', -1, 'rusak')$q$, 'qty negatif');
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 5, 'rusak')$q$, 'tanpa perubahan');
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 9, 'rusak')$q$, 'naik dengan alasan rusak');
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 4, 'lainnya')$q$, 'alasan tidak valid');
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-0000000000ff', 1, 'rusak')$q$, 'batch tidak ada');
select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 6, 'koreksi');
do $$ begin
  perform tst.assert((select nilai from stock_adjustments where alasan='koreksi') = -6000, 'koreksi naik: nilai negatif');
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000e1');
select tst.expect_error($q$select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 1, 'rusak')$q$, 'kasir tidak boleh menyesuaikan');
-- penurunan ke <= min_stock memicu saran (pemilik melakukan)
select tst.as_user('00000000-0000-0000-0000-0000000000e4');
select adjust_stock('bbbbbbbb-0000-0000-0000-00000000000a', 4, 'kedaluwarsa');
reset role;
do $$ begin
  perform tst.assert((select count(*) from purchase_suggestions where product_id='bbbbbbbb-0000-0000-0000-000000000001' and status='terbuka') = 1, 'penyesuaian memicu saran pembelian');
end $$;

-- laporan_keuangan (pemilik)
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000e4');
do $$ declare h date := (now() at time zone 'Asia/Jakarta')::date; begin
  perform tst.assert((select count(*) from laporan_keuangan(h-3, h)) = 4, 'satu baris per hari termasuk hari kosong');
  perform tst.assert((select jumlah_transaksi||'/'||penjualan||'/'||hpp||'/'||laba_kotor from laporan_keuangan(h-3,h) where tanggal = h-3) = '1/20000/12000/8000', 'hari h-3');
  perform tst.assert((select jumlah_transaksi||'/'||penjualan from laporan_keuangan(h-3,h) where tanggal = h-2) = '0/0', 'hari kosong bernilai nol');
  perform tst.assert((select jumlah_transaksi||'/'||penjualan||'/'||hpp||'/'||laba_kotor from laporan_keuangan(h-3,h) where tanggal = h-1) = '1/10000/6000/4000', 'penjualan 00:30 WIB masuk tanggal WIB, bukan UTC');
  perform tst.assert((select kerugian_stok from laporan_keuangan(h-3,h) where tanggal = h) = 12000 + 12000, 'kerugian hari ini: rusak 12000 + kedaluwarsa 12000 (koreksi naik tidak mengurangi)');
  perform tst.assert((select qty_terjual||'/'||penjualan||'/'||hpp||'/'||laba_kotor from laporan_produk(h-3,h) where product_id='bbbbbbbb-0000-0000-0000-000000000001') = '3/30000/18000/12000', 'laporan produk E');
  perform tst.assert((select laba_kotor from laporan_produk(h-3,h) limit 1) = (select max(laba_kotor) from laporan_produk(h-3,h)), 'urut laba terbesar dulu');
  perform tst.expect_error(format($f$select * from laporan_keuangan(%L,%L)$f$, h, h-1), 'sampai < dari');
  perform tst.expect_error(format($f$select * from laporan_keuangan(%L,%L)$f$, h-366, h), 'rentang > 366 hari');
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000e3');
select tst.expect_error($q$select * from laporan_keuangan(current_date, current_date)$q$, 'staf gudang tidak boleh laporan');
select tst.expect_error($q$select * from laporan_produk(current_date, current_date)$q$, 'staf gudang tidak boleh laporan produk');
select tst.as_user('00000000-0000-0000-0000-0000000000e1');
select tst.expect_error($q$select * from laporan_keuangan(current_date, current_date)$q$, 'kasir tidak boleh laporan');
reset role;

rollback;
\echo 'SEMUA UJI ERP LULUS'
