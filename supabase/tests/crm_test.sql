-- Uji skema CRM. Dijalankan oleh run.sh setelah erp_test.sql pada DB bersih. Semua di-rollback.
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
  ('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000c3'),('00000000-0000-0000-0000-0000000000c4');
insert into profiles(id,nama,peran) values
  ('00000000-0000-0000-0000-0000000000c1','Kasir A','kasir'),
  ('00000000-0000-0000-0000-0000000000c2','Kasir B','kasir'),
  ('00000000-0000-0000-0000-0000000000c3','Gudang','staf_gudang'),
  ('00000000-0000-0000-0000-0000000000c4','Pemilik','pemilik');

-- (1) aturan poin dan tier (angka sama dengan src/lib/loyalty.test.ts)
select tst.assert(poin_dari(9999) = 0, 'poin 9999 = 0');
select tst.assert(poin_dari(10000) = 1, 'poin 10000 = 1');
select tst.assert(poin_dari(19999) = 1, 'poin 19999 = 1');
select tst.assert(poin_dari(0) = 0, 'poin 0 = 0');
select tst.assert(tier_dari(0) = 'reguler', 'tier 0');
select tst.assert(tier_dari(499999) = 'reguler', 'tier 499999 reguler');
select tst.assert(tier_dari(500000) = 'silver', 'tier 500000 silver');
select tst.assert(tier_dari(1999999) = 'silver', 'tier 1999999 silver');
select tst.assert(tier_dari(2000000) = 'gold', 'tier 2000000 gold');

-- (2) normalisasi telepon
select tst.assert(normalisasi_telepon('0812-3456-7890') = '6281234567890', 'format 0812-...');
select tst.assert(normalisasi_telepon('+62 812 3456 7890') = '6281234567890', 'format +62');
select tst.assert(normalisasi_telepon('62 812-3456-7890') = '6281234567890', 'format 62');
select tst.assert(normalisasi_telepon(null) is null and normalisasi_telepon('  ') is null, 'kosong -> null');
select tst.expect_error($q$select normalisasi_telepon('abc')$q$, 'telepon tanpa digit');

-- (3) keunikan telepon lintas format; telepon kosong boleh banyak
insert into customers(nama, telepon) values ('Budi', '0812-3456-7890');
select tst.assert((select telepon from customers where nama='Budi') = '6281234567890', 'trigger menormalkan saat insert');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Budi Dua', '+62 812 3456 7890')$q$, 'duplikat beda format');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Salah', 'abc')$q$, 'telepon tidak valid');
insert into customers(nama) values ('Tanpa Telepon 1'), ('Tanpa Telepon 2');
select tst.expect_error($q$update customers set telepon = '0812 3456 7890' where nama = 'Tanpa Telepon 1'$q$, 'update menjadi duplikat');

-- (4) hak akses: kasir boleh tambah/ubah profil, tidak boleh menyentuh kolom hitungan, tidak boleh hapus
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000c1');
insert into customers(nama, telepon, email) values ('Dari Kasir', '0813-0000-1111', 'a@contoh.id');
update customers set nama = 'Dari Kasir (ubah)' where telepon = '6281300001111';
select tst.assert((select nama from customers where telepon='6281300001111') = 'Dari Kasir (ubah)', 'kasir mengubah profil');
select tst.expect_error($q$update customers set poin = 999 where telepon='6281300001111'$q$, 'kasir ubah poin');
select tst.expect_error($q$update customers set tier = 'gold' where telepon='6281300001111'$q$, 'kasir ubah tier');
select tst.expect_error($q$update customers set total_belanja = 5000000 where telepon='6281300001111'$q$, 'kasir ubah total_belanja');
select tst.expect_error($q$update customers set jumlah_transaksi = 9 where telepon='6281300001111'$q$, 'kasir ubah jumlah_transaksi');
select tst.expect_error($q$insert into customers(nama, poin) values ('Curang', 500)$q$, 'kasir insert dengan poin');
select tst.expect_error($q$delete from customers where telepon='6281300001111'$q$, 'kasir hapus');
select tst.assert((select count(*) from customers) >= 4, 'kasir membaca pelanggan');

-- staf gudang: tidak melihat dan tidak bisa menulis
select tst.as_user('00000000-0000-0000-0000-0000000000c3');
select tst.assert((select count(*) from customers) = 0, 'staf gudang tidak melihat pelanggan');
select tst.expect_error($q$insert into customers(nama) values ('Dari Gudang')$q$, 'staf gudang insert');
reset role;

-- (5) kolom penjualan baru
select tst.assert((select count(*) from information_schema.columns where table_name='sales' and column_name in ('customer_id','poin')) = 2, 'sales.customer_id dan sales.poin ada');

-- (6) view segmentasi (tanggal WIB): batas 30 dan 90 hari, belum pernah belanja
select tst.sudo($q$
  insert into customers(nama, telepon, tgl_daftar, terakhir_belanja, jumlah_transaksi, total_belanja, poin, tier)
  select v.nama, v.tel,
         (((now() at time zone 'Asia/Jakarta')::date - v.daftar)::text || ' 09:00:00+07')::timestamptz,
         case when v.beli is null then null else (((now() at time zone 'Asia/Jakarta')::date - v.beli)::text || ' 12:00:00+07')::timestamptz end,
         case when v.beli is null then 0 else 3 end, case when v.beli is null then 0 else 600000 end, 0, 'silver'
  from (values
    ('SEG baru',        '62811000001', 1,   null::int),
    ('SEG baru 30h',    '62811000002', 30,  null),
    ('SEG tdk 31h',     '62811000003', 31,  null),
    ('SEG tdk 45h',     '62811000004', 45,  null),
    ('SEG aktif 0h',    '62811000005', 200, 0),
    ('SEG aktif 29h',   '62811000006', 200, 29),
    ('SEG aktif 30h',   '62811000007', 200, 30),
    ('SEG berisiko 31', '62811000008', 200, 31),
    ('SEG berisiko 90', '62811000009', 200, 90),
    ('SEG tidak 91h',   '62811000010', 200, 91)
  ) as v(nama, tel, daftar, beli)
$q$);
select tst.as_user('00000000-0000-0000-0000-0000000000c4');
set local role authenticated;
do $$ declare r record; begin
  for r in select * from (values
      ('SEG baru','baru'),('SEG baru 30h','baru'),('SEG tdk 31h','tidak_aktif'),('SEG tdk 45h','tidak_aktif'),
      ('SEG aktif 0h','aktif'),('SEG aktif 29h','aktif'),('SEG aktif 30h','aktif'),
      ('SEG berisiko 31','berisiko'),('SEG berisiko 90','berisiko'),('SEG tidak 91h','tidak_aktif')
    ) as t(nama, harap) loop
    perform tst.assert((select aktivitas from pelanggan_segmen where nama = r.nama) = r.harap,
      format('aktivitas %s harus %s', r.nama, r.harap));
  end loop;
  perform tst.assert((select hari_sejak_belanja from pelanggan_segmen where nama='SEG berisiko 31') = 31, 'hari_sejak_belanja 31');
  perform tst.assert((select hari_sejak_belanja from pelanggan_segmen where nama='SEG baru') is null, 'hari_sejak_belanja null bila belum belanja');
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000c1');
select tst.assert((select count(*) from pelanggan_segmen) = 0, 'kasir tidak melihat segmentasi');
select tst.as_user('00000000-0000-0000-0000-0000000000c3');
select tst.assert((select count(*) from pelanggan_segmen) = 0, 'staf gudang tidak melihat segmentasi');
reset role;


-- ===== Task 2: checkout dengan pelanggan =====
insert into storage_locations(id,nama,tipe) values ('d1000000-0000-0000-0000-000000000001','Freezer CRM','freezer');
insert into products(id,sku,nama,satuan,harga_beli,harga_jual,min_stock,reorder_qty) values
  ('d2000000-0000-0000-0000-000000000001','CP','Produk CRM','pcs',6000,12500,0,10),
  ('d2000000-0000-0000-0000-000000000002','CQ','Produk 9999','pcs',5000,9999,0,10);
insert into batches(product_id,location_id,kode_batch,qty,tgl_kedaluwarsa,harga_beli) values
  ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','CRM1',1000,(now() at time zone 'Asia/Jakarta')::date+90,6000),
  ('d2000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000001','CRM2',50,(now() at time zone 'Asia/Jakarta')::date+90,5000);
insert into customers(id,nama,telepon) values
  ('d3000000-0000-0000-0000-00000000000a','Pelanggan A','62899000001'),
  ('d3000000-0000-0000-0000-00000000000c','Pelanggan C','62899000003');
insert into customers(id,nama,telepon,aktif) values ('d3000000-0000-0000-0000-00000000000b','Pelanggan B (nonaktif)','62899000002',false);

set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000c1');

-- (a) transaksi pertama: Rp25.000 -> 2 poin
do $$ declare s uuid; begin
  s := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a');
  perform tst.assert((select customer_id from sales where id=s) = 'd3000000-0000-0000-0000-00000000000a', 'sales.customer_id terisi');
  perform tst.assert((select poin from sales where id=s) = 2, 'sales.poin = 2');
  perform tst.assert((select poin||'/'||total_belanja||'/'||jumlah_transaksi||'/'||tier from customers where id='d3000000-0000-0000-0000-00000000000a') = '2/25000/1/reguler', 'hitungan pelanggan setelah transaksi 1');
  perform tst.assert((select terakhir_belanja from customers where id='d3000000-0000-0000-0000-00000000000a') is not null, 'terakhir_belanja terisi');
end $$;

-- (b) kumulatif tepat 500.000 -> silver; 2.000.000 -> gold
do $$ declare s uuid; begin
  s := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":38}]'::jsonb,'tunai',475000,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a');
  perform tst.assert((select tier||'/'||total_belanja||'/'||poin from customers where id='d3000000-0000-0000-0000-00000000000a') = 'silver/500000/49', 'tepat 500000 = silver, poin 2+47');
  s := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":120}]'::jsonb,'qris',1500000,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a');
  perform tst.assert((select tier||'/'||total_belanja||'/'||jumlah_transaksi from customers where id='d3000000-0000-0000-0000-00000000000a') = 'gold/2000000/3', 'tepat 2000000 = gold');
end $$;

-- (c) pembulatan poin per transaksi: Rp9.999 -> 0 poin, total belanja tetap bertambah
do $$ begin
  perform checkout('[{"product_id":"d2000000-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',9999,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000c');
  perform checkout('[{"product_id":"d2000000-0000-0000-0000-000000000002","qty":1}]'::jsonb,'tunai',9999,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000c');
  perform tst.assert((select poin||'/'||total_belanja||'/'||jumlah_transaksi||'/'||tier from customers where id='d3000000-0000-0000-0000-00000000000c') = '0/19998/2/reguler', 'Rp9.999 dua kali: poin tetap 0');
end $$;

-- (d) transaksi gagal tidak mengubah pelanggan maupun stok
do $$ declare awal text; stok int; begin
  select poin||'/'||total_belanja||'/'||jumlah_transaksi||'/'||tier into awal from customers where id='d3000000-0000-0000-0000-00000000000a';
  select sum(qty) into stok from batches where product_id='d2000000-0000-0000-0000-000000000001';
  perform tst.expect_error($q$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":99999}]'::jsonb,'tunai',999999999,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a')$q$, 'stok kurang');
  perform tst.expect_error($q$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',1,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a')$q$, 'bayar kurang');
  perform tst.assert((select poin||'/'||total_belanja||'/'||jumlah_transaksi||'/'||tier from customers where id='d3000000-0000-0000-0000-00000000000a') = awal, 'pelanggan tidak berubah setelah gagal');
  perform tst.assert((select sum(qty) from batches where product_id='d2000000-0000-0000-0000-000000000001') = stok, 'stok tidak berubah setelah gagal');
end $$;

-- (e) idempotensi: kirim ulang tidak menambah poin dua kali; kunci sama pelanggan lain ditolak
do $$ declare k uuid := gen_random_uuid(); s1 uuid; s2 uuid; poin_awal int; begin
  select poin into poin_awal from customers where id='d3000000-0000-0000-0000-00000000000c';
  s1 := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":4}]'::jsonb,'tunai',50000,k,'d3000000-0000-0000-0000-00000000000c');
  s2 := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":4}]'::jsonb,'tunai',50000.00,k,'d3000000-0000-0000-0000-00000000000c');
  perform tst.assert(s1 = s2, 'kirim ulang mengembalikan transaksi yang sama');
  perform tst.assert((select poin from customers where id='d3000000-0000-0000-0000-00000000000c') = poin_awal + 5, 'poin hanya bertambah sekali (50000 = 5 poin)');
  perform tst.assert((select jumlah_transaksi from customers where id='d3000000-0000-0000-0000-00000000000c') = 3, 'jumlah transaksi bertambah sekali');
  perform tst.expect_error(format($f$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":4}]'::jsonb,'tunai',50000,%L,'d3000000-0000-0000-0000-00000000000a')$f$, k), 'kunci sama, pelanggan berbeda');
  perform tst.expect_error(format($f$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":4}]'::jsonb,'tunai',50000,%L)$f$, k), 'kunci sama, tanpa pelanggan');
end $$;

-- (f) pelanggan nonaktif / tidak ada ditolak, stok tidak berubah
do $$ declare stok int; begin
  select sum(qty) into stok from batches where product_id='d2000000-0000-0000-0000-000000000001';
  perform tst.expect_error($q$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',12500,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000b')$q$, 'pelanggan nonaktif');
  perform tst.expect_error($q$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',12500,gen_random_uuid(),gen_random_uuid())$q$, 'pelanggan tidak ada');
  perform tst.assert((select sum(qty) from batches where product_id='d2000000-0000-0000-0000-000000000001') = stok, 'stok tidak berubah');
end $$;

-- (g) tamu: tanpa pelanggan, tidak ada pelanggan yang berubah
do $$ declare total_poin bigint; s uuid; begin
  select sum(poin) into total_poin from customers;
  s := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,gen_random_uuid());
  perform tst.assert((select customer_id is null and poin = 0 from sales where id=s), 'penjualan tamu: customer_id null, poin 0');
  perform tst.assert((select sum(poin) from customers) = total_poin, 'tidak ada pelanggan berubah');
end $$;

-- (h) pelanggan bersama: kasir lain boleh memakainya; staf gudang tetap ditolak
select tst.as_user('00000000-0000-0000-0000-0000000000c2');
select tst.assert(checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',12500,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a') is not null, 'kasir B memakai pelanggan yang sama');
select tst.as_user('00000000-0000-0000-0000-0000000000c3');
select tst.expect_error($q$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":1}]'::jsonb,'tunai',12500,gen_random_uuid(),'d3000000-0000-0000-0000-00000000000a')$q$, 'staf gudang checkout');
reset role;


-- ===== Task 3: riwayat belanja dan produk favorit =====
select tst.as_user('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
do $$ declare a uuid := 'd3000000-0000-0000-0000-00000000000a'; begin
  perform tst.assert((select count(*) from sales where customer_id = a) = 3, 'kasir A langsung hanya melihat 3 penjualan miliknya');
  perform tst.assert((select count(*) from riwayat_pelanggan(a)) = 4, 'riwayat_pelanggan menampilkan semua 4 transaksi (termasuk milik kasir B)');
  perform tst.assert((select nomor from riwayat_pelanggan(a) limit 1) = (select max(nomor) from riwayat_pelanggan(a)), 'urut terbaru lebih dulu');
  perform tst.assert((select sum(total) from riwayat_pelanggan(a)) = 25000 + 475000 + 1500000 + 12500, 'total riwayat benar');
  perform tst.assert((select sum(poin) from riwayat_pelanggan(a)) = 2 + 47 + 150 + 1, 'poin per transaksi benar');
  perform tst.assert((select count(*) from riwayat_pelanggan(a, 0)) = 1, 'limit 0 dibatasi menjadi 1');
  perform tst.assert((select count(*) from riwayat_pelanggan(a, 1000)) = 4, 'limit 1000 dibatasi 200 (hanya 4 baris tersedia)');
  perform tst.assert((select jumlah_item from riwayat_pelanggan(a) where total = 12500) = 1, 'jumlah_item per transaksi');
  perform tst.assert((select count(*) from riwayat_pelanggan('d3000000-0000-0000-0000-00000000000b')) = 0, 'pelanggan tanpa transaksi: nol baris');
  perform tst.assert((select count(*) from riwayat_pelanggan(gen_random_uuid())) = 0, 'pelanggan tidak ada: nol baris, tanpa error');
  perform tst.assert((select nama||'/'||qty from produk_favorit_pelanggan(a) limit 1) = 'Produk CRM/161', 'produk favorit A: qty dijumlah lintas transaksi dan batch');
  perform tst.assert((select string_agg(nama||':'||qty, ',' order by qty desc) from produk_favorit_pelanggan('d3000000-0000-0000-0000-00000000000c')) = 'Produk CRM:4,Produk 9999:2', 'favorit C urut qty menurun');
  perform tst.assert((select count(*) from produk_favorit_pelanggan('d3000000-0000-0000-0000-00000000000c', 1)) = 1, 'limit favorit');
end $$;
select tst.as_user('00000000-0000-0000-0000-0000000000c3');
select tst.expect_error($q$select * from riwayat_pelanggan('d3000000-0000-0000-0000-00000000000a')$q$, 'staf gudang riwayat');
select tst.expect_error($q$select * from produk_favorit_pelanggan('d3000000-0000-0000-0000-00000000000a')$q$, 'staf gudang favorit');
reset role;


-- ===== Tahap 4 / Task 7: telepon (normalisasi v2 + check) dan retry idempoten =====
select tst.assert(normalisasi_telepon('0062 812-3456-7890') = '6281234567890', 'awalan 00 dibuang');
select tst.assert(normalisasi_telepon('812-3456-7890') = '6281234567890', 'awalan 8 tanpa 0/62 diberi 62');
select tst.assert(normalisasi_telepon('0812-3456-7890') = normalisasi_telepon('+62 812 3456 7890'), 'format lain tetap sama');
select tst.assert(normalisasi_telepon('+62 812 3456 7890') = '6281234567890', '+62 tetap benar');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Dup 00', '0062 812 3456 7890')$q$, 'duplikat lintas format (00...)');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Dup 8', '812-3456-7890')$q$, 'duplikat lintas format (8...)');
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000c1');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Liar', 'abc1')$q$, 'telepon abc1 ditolak check');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Asing', '12345678')$q$, 'nomor bukan Indonesia ditolak check');
select tst.expect_error($q$insert into customers(nama, telepon) values ('Pendek', '0812')$q$, 'nomor terlalu pendek ditolak check');
reset role;

-- retry idempoten sesudah pelanggan dinonaktifkan mengembalikan penjualan semula
insert into customers(id,nama,telepon) values ('d3000000-0000-0000-0000-0000000000e1','Pelanggan Retry','62899000091');
set local role authenticated;
select tst.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ declare k uuid := gen_random_uuid(); s1 uuid; s2 uuid; poin_awal int; begin
  s1 := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,k,'d3000000-0000-0000-0000-0000000000e1');
  select poin into poin_awal from customers where id='d3000000-0000-0000-0000-0000000000e1';
  perform tst.sudo($q$update customers set aktif = false where id='d3000000-0000-0000-0000-0000000000e1'$q$);
  s2 := checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,k,'d3000000-0000-0000-0000-0000000000e1');
  perform tst.assert(s1 = s2, 'retry setelah pelanggan dinonaktifkan mengembalikan penjualan semula');
  perform tst.assert((select poin from customers where id='d3000000-0000-0000-0000-0000000000e1') = poin_awal, 'poin tidak bertambah lagi');
  perform tst.expect_error(format($f$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,%L,'d3000000-0000-0000-0000-0000000000e1')$f$, gen_random_uuid()), 'penjualan BARU ke pelanggan nonaktif tetap ditolak');
  perform tst.expect_error(format($f$select checkout('[{"product_id":"d2000000-0000-0000-0000-000000000001","qty":2}]'::jsonb,'tunai',25000,%L,'d3000000-0000-0000-0000-00000000000a')$f$, k), 'kunci sama dengan pelanggan lain tetap ditolak');
end $$;
reset role;

rollback;
\echo 'SEMUA UJI CRM LULUS'
