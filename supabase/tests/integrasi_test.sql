-- Uji alur penuh lintas modul (SCM -> ERP -> CRM -> dashboard) dan pemeriksa integritas. Semua di-rollback.
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
create function tst.sudo(q text) returns void language plpgsql security definer as
$$ begin execute q; end $$;
grant execute on all functions in schema tst to authenticated;

insert into auth.users(id) values
  ('00000000-0000-0000-0000-0000000000f1'),('00000000-0000-0000-0000-0000000000f2'),('00000000-0000-0000-0000-0000000000f3');
insert into profiles(id,nama,peran) values
  ('00000000-0000-0000-0000-0000000000f1','Pemilik','pemilik'),
  ('00000000-0000-0000-0000-0000000000f2','Kasir','kasir'),
  ('00000000-0000-0000-0000-0000000000f3','Gudang','staf_gudang');
insert into suppliers(id,nama) values ('f1000000-0000-0000-0000-000000000001','Pemasok Alur');
insert into storage_locations(id,nama,tipe) values ('f2000000-0000-0000-0000-000000000001','Freezer Alur','freezer');
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('f3000000-0000-0000-0000-000000000001','ALUR','Produk Alur','pcs','f1000000-0000-0000-0000-000000000001',30000,50000,5,20);
insert into customers(id,nama,telepon) values ('f4000000-0000-0000-0000-000000000001','Pelanggan Alur','62866000001');

-- ===== ALUR PENUH =====
-- Waktu kedaluwarsa dibedakan agar FEFO deterministik: INT1 +90, INT2 +120, INT3 +150 hari.
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000f3');   -- staf gudang
do $$ declare po uuid; it uuid; begin
  -- (1) SCM: PO -> dipesan -> terima 10 unit
  po := create_po('f1000000-0000-0000-0000-000000000001','[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":10,"harga_beli":30000}]'::jsonb);
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform receive_goods(po, format('[{"item_id":"%s","qty":10,"location_id":"f2000000-0000-0000-0000-000000000001","kode_batch":"INT1","tgl_kedaluwarsa":"%s"}]', it, (now() at time zone 'Asia/Jakarta')::date + 90)::jsonb);
  perform tst.assert((select harga_beli from batches where kode_batch='INT1') = 30000, 'biaya batch tercatat dari harga PO');
end $$;

select tst.as_user('00000000-0000-0000-0000-0000000000f2');   -- kasir
-- (2) ERP -> CRM: jual 4 unit ke pelanggan (Rp200.000 = 20 poin); stok 6, belum ada saran
select checkout('[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":4}]'::jsonb,'tunai',200000,gen_random_uuid(),'f4000000-0000-0000-0000-000000000001');
select tst.as_user('00000000-0000-0000-0000-0000000000f1');   -- pemilik membaca
do $$ begin
  perform tst.assert((select sum(qty) from batches where product_id='f3000000-0000-0000-0000-000000000001') = 6, 'stok 6 setelah jual 4');
  perform tst.assert((select poin||'/'||total_belanja from customers where id='f4000000-0000-0000-0000-000000000001') = '20/200000', 'pelanggan: 20 poin, Rp200.000');
  perform tst.assert((select count(*) from purchase_suggestions where product_id='f3000000-0000-0000-0000-000000000001' and status='terbuka') = 0, 'stok 6 > min 5: belum ada saran');
end $$;

-- (3) ERP -> SCM: jual 1 unit lagi -> stok 5 = min -> tepat satu saran terbuka
select tst.as_user('00000000-0000-0000-0000-0000000000f2');
select checkout('[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'qris',50000,gen_random_uuid(),'f4000000-0000-0000-0000-000000000001');
select tst.as_user('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  perform tst.assert((select count(*) from purchase_suggestions where product_id='f3000000-0000-0000-0000-000000000001' and status='terbuka') = 1, 'penjualan menyentuh minimum: tepat satu saran terbuka');
  perform tst.assert((select saran_terbuka from dashboard_stok()) = 1 and (select produk_di_bawah_minimum from dashboard_stok()) = 1, 'dashboard stok menunjukkan saran dan produk di bawah minimum');
end $$;

-- (4) SCM: saran -> PO -> dipesan -> terima 20 -> stok 25, saran selesai
select tst.as_user('00000000-0000-0000-0000-0000000000f3');
do $$ declare sid uuid; po uuid; it uuid; begin
  select id into sid from purchase_suggestions where product_id='f3000000-0000-0000-0000-000000000001' and status='terbuka';
  po := create_po_from_suggestion(sid);
  perform tst.assert((select status from purchase_suggestions where id = sid) = 'dipesan', 'saran ditandai dipesan');
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform receive_goods(po, format('[{"item_id":"%s","qty":20,"location_id":"f2000000-0000-0000-0000-000000000001","kode_batch":"INT2","tgl_kedaluwarsa":"%s"}]', it, (now() at time zone 'Asia/Jakarta')::date + 120)::jsonb);
  perform tst.assert((select status from purchase_suggestions where id = sid) = 'selesai', 'saran selesai setelah barang diterima');
end $$;

-- (5) CRM: jual 5 unit -> total pelanggan TEPAT Rp500.000 -> silver
select tst.as_user('00000000-0000-0000-0000-0000000000f2');
select checkout('[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":5}]'::jsonb,'tunai',250000,gen_random_uuid(),'f4000000-0000-0000-0000-000000000001');
select tst.as_user('00000000-0000-0000-0000-0000000000f1');
select tst.assert((select tier||'/'||total_belanja from customers where id='f4000000-0000-0000-0000-000000000001') = 'silver/500000', 'tepat Rp500.000 = silver');

-- (6) terima 20 lagi (PO manual), jual 30 -> total TEPAT Rp2.000.000 -> gold; stok akhir 10
select tst.as_user('00000000-0000-0000-0000-0000000000f3');
do $$ declare po uuid; it uuid; begin
  po := create_po('f1000000-0000-0000-0000-000000000001','[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":20,"harga_beli":30000}]'::jsonb);
  perform set_po_status(po,'dipesan');
  select id into it from purchase_order_items where po_id = po;
  perform receive_goods(po, format('[{"item_id":"%s","qty":20,"location_id":"f2000000-0000-0000-0000-000000000001","kode_batch":"INT3","tgl_kedaluwarsa":"%s"}]', it, (now() at time zone 'Asia/Jakarta')::date + 150)::jsonb);
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000f2');
select checkout('[{"product_id":"f3000000-0000-0000-0000-000000000001","qty":30}]'::jsonb,'qris',1500000,gen_random_uuid(),'f4000000-0000-0000-0000-000000000001');

-- (7) penyesuaian: rusak 2 unit pada INT3 (qty 10 -> 8), kerugian 2 x 30.000
select tst.as_user('00000000-0000-0000-0000-0000000000f3');
select adjust_stock((select id from batches where kode_batch='INT3'), 8, 'rusak', 'alur penuh');

-- ===== INVARIAN LINTAS MODUL (dibaca pemilik) =====
select tst.as_user('00000000-0000-0000-0000-0000000000f1');
do $$ declare h date := (now() at time zone 'Asia/Jakarta')::date; r record; s record; begin
  -- pelanggan
  perform tst.assert((select poin||'/'||total_belanja||'/'||jumlah_transaksi||'/'||tier from customers where id='f4000000-0000-0000-0000-000000000001') = '200/2000000/4/gold', 'pelanggan akhir: 200 poin, Rp2.000.000, 4 transaksi, gold');
  -- stok: diterima - terjual - disesuaikan
  perform tst.assert((select sum(qty) from batches where product_id='f3000000-0000-0000-0000-000000000001')
    = (select sum(qty_diterima) from purchase_order_items where product_id='f3000000-0000-0000-0000-000000000001')
    - (select sum(qty) from sale_items where product_id='f3000000-0000-0000-0000-000000000001')
    - (select sum(qty_sebelum - qty_sesudah) from stock_adjustments where product_id='f3000000-0000-0000-0000-000000000001'), 'stok akhir = diterima - terjual - disesuaikan');
  perform tst.assert((select sum(qty) from batches where product_id='f3000000-0000-0000-0000-000000000001') = 8, 'stok akhir 8');
  -- dashboard = laporan
  select * into r from dashboard_ringkasan(h, h);
  perform tst.assert(r.penjualan = 2000000 and r.hpp = 1200000 and r.laba_kotor = 800000 and r.transaksi = 4 and r.transaksi_member = 4, 'dashboard: penjualan 2.000.000, hpp 1.200.000, laba 800.000, 4 transaksi berpelanggan');
  perform tst.assert(r.kerugian_stok = 60000, 'kerugian stok 2 x 30.000');
  perform tst.assert(r.penjualan = (select penjualan from laporan_keuangan(h, h)) and r.laba_kotor = (select laba_kotor from laporan_keuangan(h, h)), 'dashboard sama dengan laporan_keuangan');
  perform tst.assert((select laba_kotor from laporan_produk(h, h) where nama = 'Produk Alur') = 800000, 'laporan_produk sama');
  -- stok dashboard
  select * into s from dashboard_stok();
  perform tst.assert(s.nilai_persediaan = 8 * 30000 and s.produk_di_bawah_minimum = 0 and s.saran_terbuka = 0, 'dashboard stok: persediaan 240.000, tidak ada saran');
  -- segmentasi
  perform tst.assert((select tier||'/'||aktivitas from pelanggan_segmen where id='f4000000-0000-0000-0000-000000000001') = 'gold/aktif', 'segmentasi: gold dan aktif');
  -- aktivitas lintas modul
  perform tst.assert((select count(distinct jenis) from aktivitas_terbaru(50)) = 5, 'aktivitas memuat penjualan, saran, PO, penyesuaian, pelanggan baru');
end $$;

-- ===== PEMERIKSA INTEGRITAS =====
do $$ begin
  perform tst.assert((select count(*) from cek_integritas()) = 7, 'tujuh pemeriksaan');
  perform tst.assert((select bool_and(ok) from cek_integritas()), 'data hasil alur penuh: semua pemeriksaan ok');
  perform tst.assert((select bool_and(jumlah_masalah = 0 and contoh = '') from cek_integritas()), 'tidak ada masalah dan contoh kosong');
end $$;

-- Mutasi (setiap mutasi di-rollback lewat sub-transaksi): pemeriksa HARUS mendeteksinya.
do $$ declare c text := 'f4000000-0000-0000-0000-000000000001'; begin
  begin   -- poin pelanggan tidak cocok dengan penjualan
    perform tst.sudo('update customers set poin = poin + 1');
    perform tst.assert((select not ok and jumlah_masalah = 1 and contoh like '%' || c || '%' from cek_integritas() where kode = 'poin_pelanggan'), 'deteksi poin pelanggan salah');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- total belanja / jumlah transaksi
    perform tst.sudo('update customers set jumlah_transaksi = jumlah_transaksi + 1');
    perform tst.assert((select not ok from cek_integritas() where kode = 'belanja_pelanggan'), 'deteksi jumlah transaksi salah');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- tier tidak sesuai total belanja
    perform tst.sudo($q$update customers set tier = 'reguler'$q$);
    perform tst.assert((select not ok from cek_integritas() where kode = 'tier_pelanggan'), 'deteksi tier salah');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- total penjualan tidak sama dengan jumlah itemnya
    perform tst.sudo('update sales set total = total + 1 where id = (select id from sales limit 1)');
    perform tst.assert((select not ok from cek_integritas() where kode = 'total_penjualan'), 'deteksi total penjualan salah');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- stok negatif (constraint dilepas dalam sub-transaksi yang di-rollback)
    perform tst.sudo('alter table batches drop constraint batches_qty_check');
    perform tst.sudo('update batches set qty = -1 where kode_batch = ''INT3''');
    perform tst.assert((select not ok and contoh <> '' from cek_integritas() where kode = 'stok_negatif'), 'deteksi stok negatif');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- PO berstatus diterima tetapi masih ada sisa
    perform tst.sudo('update purchase_order_items set qty_diterima = 1 where id = (select id from purchase_order_items limit 1)');
    perform tst.assert((select not ok from cek_integritas() where kode = 'penerimaan_po'), 'deteksi penerimaan PO tidak konsisten');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  begin   -- dua saran terbuka untuk produk yang sama (indeks unik dilepas dalam sub-transaksi)
    perform tst.sudo('drop index one_open_suggestion');
    perform tst.sudo($q$insert into purchase_suggestions(product_id, qty_disarankan, status) select id, 5, 'terbuka' from products$q$);
    perform tst.sudo($q$insert into purchase_suggestions(product_id, qty_disarankan, status) select id, 5, 'terbuka' from products$q$);
    perform tst.assert((select not ok from cek_integritas() where kode = 'saran_ganda'), 'deteksi saran ganda');
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then raise; end if; end;
  -- setelah semua mutasi di-rollback, data kembali sehat
  perform tst.assert((select bool_and(ok) from cek_integritas()), 'semua ok kembali setelah rollback mutasi');
end $$;

-- izin
select tst.as_user('00000000-0000-0000-0000-0000000000f2');
select tst.expect_error($q$select * from cek_integritas()$q$, 'kasir cek_integritas');
select tst.as_user('00000000-0000-0000-0000-0000000000f3');
select tst.expect_error($q$select * from cek_integritas()$q$, 'staf gudang cek_integritas');
reset role;

rollback;
\echo 'SEMUA UJI INTEGRASI LULUS'
