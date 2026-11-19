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

rollback;
\echo 'SEMUA UJI CRM LULUS'
