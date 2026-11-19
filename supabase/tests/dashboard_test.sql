-- Uji RPC dashboard. Dijalankan oleh run.sh setelah crm_test.sql pada DB bersih (tanpa data). Semua di-rollback.
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
  ('00000000-0000-0000-0000-0000000000d1'),('00000000-0000-0000-0000-0000000000d2'),('00000000-0000-0000-0000-0000000000d3');
insert into profiles(id,nama,peran) values
  ('00000000-0000-0000-0000-0000000000d1','Pemilik','pemilik'),
  ('00000000-0000-0000-0000-0000000000d2','Kasir','kasir'),
  ('00000000-0000-0000-0000-0000000000d3','Gudang','staf_gudang');

-- ===== (a) database KOSONG: semua RPC aman, bernilai nol =====
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ declare h date := (now() at time zone 'Asia/Jakarta')::date; r record; begin
  select * into r from dashboard_ringkasan(h, h);
  perform tst.assert(r.penjualan = 0 and r.hpp = 0 and r.laba_kotor = 0 and r.transaksi = 0 and r.transaksi_member = 0
    and r.rata_transaksi = 0 and r.kerugian_stok = 0 and r.penjualan_sebelumnya = 0 and r.laba_sebelumnya = 0
    and r.transaksi_sebelumnya = 0 and r.pelanggan_baru = 0, 'ringkasan kosong bernilai nol (bukan null)');
  select * into r from dashboard_stok();
  perform tst.assert(r.nilai_persediaan = 0 and r.nilai_kedaluwarsa = 0 and r.produk_aktif = 0 and r.produk_di_bawah_minimum = 0
    and r.produk_habis = 0 and r.saran_terbuka = 0 and r.batch_hampir_kedaluwarsa = 0 and r.batch_kedaluwarsa = 0
    and r.po_menunggu = 0 and r.nilai_po_menunggu = 0, 'stok kosong bernilai nol');
  perform tst.assert((select count(*) from pelanggan_teratas(h-30, h)) = 0, 'pelanggan teratas kosong');
  perform tst.assert((select count(*) from aktivitas_terbaru()) = 0, 'aktivitas kosong');
end $$;
reset role;

-- ===== fixture =====
insert into suppliers(id,nama) values ('e1000000-0000-0000-0000-000000000001','Pemasok Dash');
insert into storage_locations(id,nama,tipe) values ('e2000000-0000-0000-0000-000000000001','Freezer Dash','freezer');
insert into products(id,sku,nama,satuan,supplier_id,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('e3000000-0000-0000-0000-00000000000a','DA','Produk DA','pcs','e1000000-0000-0000-0000-000000000001',6000,10000,5,20),
  ('e3000000-0000-0000-0000-00000000000b','DB','Produk DB','pcs','e1000000-0000-0000-0000-000000000001',3000,4000,0,10),
  ('e3000000-0000-0000-0000-00000000000c','DC','Produk DC','pcs','e1000000-0000-0000-0000-000000000001',2000,3000,10,10),
  ('e3000000-0000-0000-0000-00000000000d','DD','Produk DD (stok kosong)','pcs','e1000000-0000-0000-0000-000000000001',1000,2000,0,10);
insert into batches(id,product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values
  ('e4000000-0000-0000-0000-0000000000a1','e3000000-0000-0000-0000-00000000000a','e2000000-0000-0000-0000-000000000001','BA1',10,(now() at time zone 'Asia/Jakarta')::date+30,5000),
  ('e4000000-0000-0000-0000-0000000000a2','e3000000-0000-0000-0000-00000000000a','e2000000-0000-0000-0000-000000000001','BA2',4,(now() at time zone 'Asia/Jakarta')::date,5000),
  ('e4000000-0000-0000-0000-0000000000b1','e3000000-0000-0000-0000-00000000000b','e2000000-0000-0000-0000-000000000001','BB1',20,(now() at time zone 'Asia/Jakarta')::date+14,null),
  ('e4000000-0000-0000-0000-0000000000b2','e3000000-0000-0000-0000-00000000000b','e2000000-0000-0000-0000-000000000001','BB2',6,(now() at time zone 'Asia/Jakarta')::date+15,3000),
  ('e4000000-0000-0000-0000-0000000000c1','e3000000-0000-0000-0000-00000000000c','e2000000-0000-0000-0000-000000000001','BC1',10,(now() at time zone 'Asia/Jakarta')::date+60,2000);
-- PO: dipesan (10 dipesan, 4 diterima, tanpa batch), draft, dan diterima (dua terakhir tidak boleh dihitung)
insert into purchase_orders(id,supplier_id,status) values
  ('e5000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','dipesan'),
  ('e5000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','draft'),
  ('e5000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','diterima');
insert into purchase_order_items(po_id,product_id,qty_pesan,qty_diterima,harga_beli) values
  ('e5000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-00000000000a',10,4,5500),
  ('e5000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-00000000000a',7,0,5500),
  ('e5000000-0000-0000-0000-000000000003','e3000000-0000-0000-0000-00000000000a',5,5,5500);

-- ===== (e) dashboard_stok (dibaca SEBELUM penjualan agar angka pasti) =====
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ declare r record; begin
  select * into r from dashboard_stok();
  perform tst.assert(r.nilai_persediaan = 10*5000 + 20*3000 + 6*3000 + 10*2000, 'nilai persediaan: hanya batch layak jual x biaya batch (fallback harga produk)');
  perform tst.assert(r.nilai_kedaluwarsa = 4*5000, 'nilai kedaluwarsa: batch kedaluwarsa hari ini WIB');
  perform tst.assert(r.batch_kedaluwarsa = 1, 'batch kedaluwarsa = 1');
  perform tst.assert(r.batch_hampir_kedaluwarsa = 1 and r.nilai_hampir_kedaluwarsa = 20*3000, 'hampir kedaluwarsa: +14 hari dihitung, +15 hari tidak');
  perform tst.assert(r.produk_aktif = 4, 'produk aktif = 4');
  perform tst.assert(r.produk_di_bawah_minimum = 2, 'di bawah minimum: DC (stok = min) dan DD (stok 0)');
  perform tst.assert(r.produk_habis = 1, 'produk habis: DD');
  perform tst.assert(r.saran_terbuka = 2, 'saran terbuka sama dengan produk di bawah minimum');
  perform tst.assert(r.po_menunggu = 1 and r.nilai_po_menunggu = 6*5500, 'PO menunggu: hanya status dipesan, sisa (10-4) x 5500');
  perform tst.assert(r.nilai_persediaan = (select sum(b.qty * coalesce(b.harga_beli, p.harga_beli)) from batches b join products p on p.id = b.product_id
                                           where b.qty > 0 and b.tgl_kedaluwarsa > (now() at time zone 'Asia/Jakarta')::date), 'nilai persediaan sama dengan jumlah langsung per batch layak jual');
  perform tst.assert((select sum(stok) from stok_layak) = 10 + 20 + 6 + 10, 'stok_layak konsisten dengan batch layak jual');
end $$;
-- staf gudang: hitungan sama, nilai rupiah null
select tst.as_user('00000000-0000-0000-0000-0000000000d3');
do $$ declare r record; begin
  select * into r from dashboard_stok();
  perform tst.assert(r.nilai_persediaan is null and r.nilai_kedaluwarsa is null and r.nilai_hampir_kedaluwarsa is null and r.nilai_po_menunggu is null, 'staf gudang: nilai rupiah null');
  perform tst.assert(r.produk_aktif = 4 and r.produk_di_bawah_minimum = 2 and r.saran_terbuka = 2 and r.po_menunggu = 1 and r.batch_kedaluwarsa = 1, 'staf gudang: hitungan sama dengan pemilik');
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000d2');
select tst.expect_error($q$select * from dashboard_stok()$q$, 'kasir dashboard_stok');
reset role;

-- ===== penjualan (lewat checkout) lalu tanggal digeser =====
insert into customers(id,nama,telepon,tgl_daftar) values
  ('e6000000-0000-0000-0000-00000000000a','Pelanggan Dash 1','62877000001',now()),
  ('e6000000-0000-0000-0000-00000000000b','Pelanggan Dash 2','62877000002',now() - interval '10 days');
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000d2');
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000a","qty":2}]'::jsonb,'tunai',20000,'e7000000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-00000000000a');   -- S1: 20000, hpp 10000
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000b","qty":1}]'::jsonb,'tunai',4000,'e7000000-0000-0000-0000-000000000002');                                                   -- S2: 4000, hpp 3000, tamu
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000a","qty":1}]'::jsonb,'tunai',10000,'e7000000-0000-0000-0000-000000000003');                                                  -- S3: kemarin 00:30 WIB
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000a","qty":1}]'::jsonb,'tunai',10000,'e7000000-0000-0000-0000-000000000004');                                                  -- S4: h-4
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000b","qty":2}]'::jsonb,'tunai',8000,'e7000000-0000-0000-0000-000000000005');                                                   -- S5: h-3, hpp 6000
select checkout('[{"product_id":"e3000000-0000-0000-0000-00000000000b","qty":3}]'::jsonb,'tunai',12000,'e7000000-0000-0000-0000-000000000006','e6000000-0000-0000-0000-00000000000b');  -- S6: 12000, hpp 9000
reset role;
update sales set created_at = ((((now() at time zone 'Asia/Jakarta')::date - 1)::text) || ' 00:30:00+07')::timestamptz where idempotency_key = 'e7000000-0000-0000-0000-000000000003';
update sales set created_at = ((((now() at time zone 'Asia/Jakarta')::date - 4)::text) || ' 12:00:00+07')::timestamptz where idempotency_key = 'e7000000-0000-0000-0000-000000000004';
update sales set created_at = ((((now() at time zone 'Asia/Jakarta')::date - 3)::text) || ' 12:00:00+07')::timestamptz where idempotency_key = 'e7000000-0000-0000-0000-000000000005';
-- penyesuaian: rusak 2 unit pada BA1 (qty 6 -> 4), nilai 2 x 5000
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000d3');
select adjust_stock('e4000000-0000-0000-0000-0000000000a1', 4, 'rusak', 'uji dashboard');
reset role;

-- ===== (b) ringkasan, (c) rekonsiliasi, (d) pembanding =====
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ declare h date := (now() at time zone 'Asia/Jakarta')::date; r record; begin
  select * into r from dashboard_ringkasan(h, h);
  perform tst.assert(r.penjualan = 36000 and r.hpp = 22000 and r.laba_kotor = 14000, 'hari ini: penjualan 36000, hpp 22000, laba 14000');
  perform tst.assert(r.transaksi = 3 and r.transaksi_member = 2 and r.rata_transaksi = 12000, 'hari ini: 3 transaksi, 2 berpelanggan, rata-rata 12000');
  perform tst.assert(r.kerugian_stok = 10000, 'kerugian stok hari ini 10000');
  perform tst.assert(r.pelanggan_baru = 1, 'pelanggan baru hari ini = 1 (yang satu lagi terdaftar 10 hari lalu)');
  perform tst.assert(r.penjualan_sebelumnya = 10000 and r.laba_sebelumnya = 5000 and r.transaksi_sebelumnya = 1, 'pembanding 1 hari = kemarin (penjualan 00:30 WIB masuk kemarin WIB)');

  select * into r from dashboard_ringkasan(h-1, h);
  perform tst.assert(r.penjualan = 46000 and r.transaksi = 4, '2 hari: penjualan 00:30 WIB kemarin ikut');

  -- pembanding sepanjang periode: 3 hari (h-2..h) dibanding h-5..h-3 = S4 + S5
  select * into r from dashboard_ringkasan(h-2, h);
  perform tst.assert(r.penjualan = 46000, '3 hari: penjualan 46000');
  perform tst.assert(r.penjualan_sebelumnya = 18000 and r.transaksi_sebelumnya = 2 and r.laba_sebelumnya = (10000-5000) + (8000-6000), 'pembanding tepat 3 hari sebelumnya');
  -- tanpa transaksi pada pembanding -> 0, bukan null
  select * into r from dashboard_ringkasan(h-5, h-3);
  perform tst.assert(r.penjualan = 18000 and r.penjualan_sebelumnya = 0 and r.transaksi_sebelumnya = 0, 'pembanding kosong bernilai 0');

  -- rekonsiliasi dengan laporan_keuangan dan laporan_produk (sumber kebenaran Tahap 2)
  select * into r from dashboard_ringkasan(h-5, h);
  perform tst.assert(r.penjualan = (select sum(penjualan) from laporan_keuangan(h-5, h)), 'rekonsiliasi penjualan');
  perform tst.assert(r.hpp = (select sum(hpp) from laporan_keuangan(h-5, h)), 'rekonsiliasi hpp');
  perform tst.assert(r.laba_kotor = (select sum(laba_kotor) from laporan_keuangan(h-5, h)), 'rekonsiliasi laba kotor');
  perform tst.assert(r.kerugian_stok = (select sum(kerugian_stok) from laporan_keuangan(h-5, h)), 'rekonsiliasi kerugian stok');
  perform tst.assert(r.transaksi = (select sum(jumlah_transaksi) from laporan_keuangan(h-5, h)), 'rekonsiliasi jumlah transaksi');
  perform tst.assert(r.penjualan = (select sum(penjualan) from laporan_produk(h-5, h)), 'rekonsiliasi dengan laporan_produk');

  -- rentang tidak valid
  perform tst.expect_error(format($f$select * from dashboard_ringkasan(%L,%L)$f$, h, h-1), 'sampai < dari');
  perform tst.expect_error(format($f$select * from dashboard_ringkasan(%L,%L)$f$, h-366, h), 'rentang 367 hari');
end $$;

-- (f) pelanggan teratas
do $$ declare h date := (now() at time zone 'Asia/Jakarta')::date; begin
  perform tst.assert((select string_agg(nama||':'||belanja||':'||transaksi||':'||poin, ',' order by belanja desc) from pelanggan_teratas(h-5, h)) = 'Pelanggan Dash 1:20000:1:2,Pelanggan Dash 2:12000:1:1', 'urut belanja, tamu diabaikan, poin dalam periode');
  perform tst.assert((select count(*) from pelanggan_teratas(h-5, h, 0)) = 1, 'limit 0 dibatasi 1');
  perform tst.assert((select count(*) from pelanggan_teratas(h-5, h, 1000)) = 2, 'limit 1000 dibatasi 50 (hanya 2 baris)');
  perform tst.assert((select count(*) from pelanggan_teratas(h-30, h-6)) = 0, 'periode tanpa penjualan berpelanggan');
end $$;

-- (g) aktivitas terbaru
do $$ declare a int := 0; begin
  perform tst.assert((select count(distinct jenis) from aktivitas_terbaru(50)) = 5, 'kelima jenis aktivitas muncul');
  -- saran yang tertutup otomatis tanpa PO (selesai, po_id null) hanya derau: tidak ditampilkan; yang masih terbuka tampil
  perform tst.assert((select count(*) from aktivitas_terbaru(50) where jenis = 'saran_pembelian') = 2, 'hanya saran terbuka (DC, DD) yang tampil; saran tertutup otomatis tidak');
  perform tst.assert((select count(*) from aktivitas_terbaru(3)) = 3, 'limit 3');
  perform tst.assert((select count(*) from aktivitas_terbaru(0)) = 1, 'limit 0 dibatasi 1');
  perform tst.assert((select array_agg(waktu) = array_agg(waktu order by waktu desc) from aktivitas_terbaru(50)), 'urut terbaru lebih dulu');
  perform tst.assert((select bool_and(tautan ~ '^/kasir/riwayat/[0-9a-f-]{36}$') from aktivitas_terbaru(50) where jenis = 'penjualan'), 'tautan penjualan');
  perform tst.assert((select bool_and(tautan ~ '^/gudang/pembelian/[0-9a-f-]{36}$') from aktivitas_terbaru(50) where jenis = 'po_dibuat'), 'tautan PO');
  perform tst.assert((select bool_and(tautan ~ '^/pelanggan/[0-9a-f-]{36}$') from aktivitas_terbaru(50) where jenis = 'pelanggan_baru'), 'tautan pelanggan');
  perform tst.assert((select bool_and(tautan = '/gudang/saran') from aktivitas_terbaru(50) where jenis = 'saran_pembelian'), 'tautan saran');
  perform tst.assert((select bool_and(tautan = '/gudang/penyesuaian') from aktivitas_terbaru(50) where jenis = 'penyesuaian_stok'), 'tautan penyesuaian');
  perform tst.assert((select judul from aktivitas_terbaru(50) where jenis = 'penjualan' and rincian like '%Pelanggan Dash 1%' limit 1) like 'Penjualan #%', 'judul penjualan memuat nomor');
  perform tst.assert((select rincian from aktivitas_terbaru(50) where jenis = 'penjualan' and rincian like '%Pelanggan Dash 1%' limit 1) like 'Rp20.000%+2 poin', 'rincian penjualan: Rupiah, pelanggan, poin');
end $$;

-- (h) izin: kasir dan staf gudang tidak boleh memanggil RPC pemilik
select tst.as_user('00000000-0000-0000-0000-0000000000d2');
select tst.expect_error($q$select * from dashboard_ringkasan(current_date, current_date)$q$, 'kasir dashboard_ringkasan');
select tst.expect_error($q$select * from pelanggan_teratas(current_date, current_date)$q$, 'kasir pelanggan_teratas');
select tst.expect_error($q$select * from aktivitas_terbaru()$q$, 'kasir aktivitas_terbaru');
select tst.as_user('00000000-0000-0000-0000-0000000000d3');
select tst.expect_error($q$select * from dashboard_ringkasan(current_date, current_date)$q$, 'staf gudang dashboard_ringkasan');
select tst.expect_error($q$select * from pelanggan_teratas(current_date, current_date)$q$, 'staf gudang pelanggan_teratas');
select tst.expect_error($q$select * from aktivitas_terbaru()$q$, 'staf gudang aktivitas_terbaru');
reset role;

rollback;
\echo 'SEMUA UJI DASHBOARD LULUS'
