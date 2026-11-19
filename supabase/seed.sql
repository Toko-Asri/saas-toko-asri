-- Toko Asri · data contoh SCM (aman dijalankan ulang; menghapus data SCM lama).
-- Jalankan SETELAH migration, di proyek Supabase DEMO (bukan produksi).
begin;

delete from sale_items;                -- riwayat penjualan dulu (mereferensikan batch dan produk)
delete from sales;
delete from stock_adjustments;
delete from batches;                 -- trigger membuat saran, jadi hapus saran sesudahnya
delete from purchase_suggestions;
delete from purchase_order_items;
delete from purchase_orders;
delete from products;
delete from storage_locations;
delete from suppliers;

insert into suppliers (id, nama, kontak, telepon, alamat) values
  ('a0000000-0000-0000-0000-000000000001', 'PT Boga Beku Nusantara', 'Pak Hendra', '021-5550101', 'Jl. Industri Raya 12, Bekasi'),
  ('a0000000-0000-0000-0000-000000000002', 'CV Laut Segar Abadi', 'Bu Sari', '031-5550202', 'Pelabuhan Perikanan Blok C, Surabaya'),
  ('a0000000-0000-0000-0000-000000000003', 'PT Dingin Manis Sejahtera', 'Pak Rudi', '022-5550303', 'Jl. Soekarno-Hatta 88, Bandung');

insert into storage_locations (id, nama, tipe, suhu_min, suhu_maks) values
  ('b0000000-0000-0000-0000-000000000001', 'Freezer A', 'freezer', -22, -18),
  ('b0000000-0000-0000-0000-000000000002', 'Freezer B', 'freezer', -24, -20),
  ('b0000000-0000-0000-0000-000000000003', 'Chiller 1', 'chiller', 0, 4),
  ('b0000000-0000-0000-0000-000000000004', 'Rak Kering', 'kering', 20, 28);

insert into products (sku, nama, satuan, supplier_id, harga_beli, harga_jual, min_stock, reorder_qty) values
  ('NGT-AYM-500', 'Nugget Ayam 500 g',        'pack', 'a0000000-0000-0000-0000-000000000001', 28000, 36000, 30, 60),
  ('SSG-SPI-500', 'Sosis Sapi 500 g',         'pack', 'a0000000-0000-0000-0000-000000000001', 32000, 41000, 25, 50),
  ('BKS-SPI-500', 'Bakso Sapi 500 g',         'pack', 'a0000000-0000-0000-0000-000000000001', 30000, 38000, 25, 50),
  ('DMP-AYM-250', 'Dumpling Ayam 250 g',      'pack', 'a0000000-0000-0000-0000-000000000001', 18000, 25000, 20, 40),
  ('KTG-GRG-1000','Kentang Goreng 1 kg',      'pack', 'a0000000-0000-0000-0000-000000000001', 35000, 45000, 20, 40),
  ('CKN-KRP-500', 'Chicken Katsu 500 g',      'pack', 'a0000000-0000-0000-0000-000000000001', 40000, 52000, 15, 30),
  ('AYM-POT-1000','Ayam Potong Beku 1 kg',    'kg',   'a0000000-0000-0000-0000-000000000001', 38000, 48000, 30, 60),
  ('IKN-DOR-500', 'Ikan Dori Fillet 500 g',   'pack', 'a0000000-0000-0000-0000-000000000002', 45000, 58000, 20, 40),
  ('UDG-KPS-500', 'Udang Kupas 500 g',        'pack', 'a0000000-0000-0000-0000-000000000002', 70000, 90000, 15, 30),
  ('CMI-RNG-500', 'Cumi Ring 500 g',          'pack', 'a0000000-0000-0000-0000-000000000002', 55000, 72000, 12, 24),
  ('IKN-SLM-300', 'Salmon Fillet 300 g',      'pack', 'a0000000-0000-0000-0000-000000000002', 85000, 110000, 10, 20),
  ('BKS-IKN-500', 'Bakso Ikan 500 g',         'pack', 'a0000000-0000-0000-0000-000000000002', 26000, 34000, 20, 40),
  ('ESK-VAN-1000','Es Krim Vanilla 1 L',      'pcs',  'a0000000-0000-0000-0000-000000000003', 32000, 42000, 24, 48),
  ('ESK-COK-1000','Es Krim Cokelat 1 L',      'pcs',  'a0000000-0000-0000-0000-000000000003', 32000, 42000, 24, 48),
  ('ESK-STR-500', 'Es Krim Stroberi 500 ml',  'pcs',  'a0000000-0000-0000-0000-000000000003', 20000, 27000, 18, 36),
  ('MOC-ASR-200', 'Mochi Es Krim 200 g',      'pack', 'a0000000-0000-0000-0000-000000000003', 24000, 32000, 15, 30),
  ('ROT-PRT-400', 'Roti Paratha Beku 400 g',  'pack', 'a0000000-0000-0000-0000-000000000001', 22000, 29000, 20, 40);

-- Batch: tanggal relatif terhadap hari ini supaya demo selalu relevan.
-- (sku, lokasi, kode_batch, qty, hari sampai kedaluwarsa)
insert into batches (product_id, location_id, kode_batch, qty, tgl_kedaluwarsa, tgl_masuk)
select p.id, l.id, v.kode, v.qty, current_date + v.hari, current_date - v.masuk
from (values
  ('NGT-AYM-500',  'b0000000-0000-0000-0000-000000000001', 'NGT-2411A', 12,  90, 10),   -- di bawah minimum (30) -> saran
  ('SSG-SPI-500',  'b0000000-0000-0000-0000-000000000001', 'SSG-2409A',  6,  -1, 60),   -- sudah kedaluwarsa
  ('SSG-SPI-500',  'b0000000-0000-0000-0000-000000000001', 'SSG-2411A', 40, 120, 8),
  ('BKS-SPI-500',  'b0000000-0000-0000-0000-000000000001', 'BKS-2410A',  8,   0, 45),   -- kedaluwarsa hari ini
  ('BKS-SPI-500',  'b0000000-0000-0000-0000-000000000001', 'BKS-2411A', 35, 150, 8),
  ('DMP-AYM-250',  'b0000000-0000-0000-0000-000000000002', 'DMP-2410A', 10,   7, 40),   -- hampir kedaluwarsa
  ('DMP-AYM-250',  'b0000000-0000-0000-0000-000000000002', 'DMP-2411A', 30,  60, 8),
  ('KTG-GRG-1000', 'b0000000-0000-0000-0000-000000000002', 'KTG-2411A', 45, 180, 6),
  ('CKN-KRP-500',  'b0000000-0000-0000-0000-000000000001', 'CKN-2411A', 22,  75, 6),
  ('AYM-POT-1000', 'b0000000-0000-0000-0000-000000000001', 'AYM-2411A', 55,  45, 5),
  ('IKN-DOR-500',  'b0000000-0000-0000-0000-000000000002', 'IKN-2411A', 28,  14, 9),    -- batas hampir kedaluwarsa
  ('UDG-KPS-500',  'b0000000-0000-0000-0000-000000000002', 'UDG-2411A', 18,  30, 7),
  ('CMI-RNG-500',  'b0000000-0000-0000-0000-000000000002', 'CMI-2411A', 14,  50, 7),
  ('IKN-SLM-300',  'b0000000-0000-0000-0000-000000000002', 'SLM-2411A',  9,  25, 7),    -- di bawah minimum (10) -> saran
  ('BKS-IKN-500',  'b0000000-0000-0000-0000-000000000003', 'BIK-2411A', 24,  10, 4),
  ('ESK-VAN-1000', 'b0000000-0000-0000-0000-000000000002', 'ESV-2410A',  5, 200, 20),   -- di bawah minimum (24) -> saran
  ('ESK-COK-1000', 'b0000000-0000-0000-0000-000000000002', 'ESC-2411A', 30, 240, 12),
  ('ESK-STR-500',  'b0000000-0000-0000-0000-000000000002', 'ESS-2411A', 20, 220, 12),
  ('MOC-ASR-200',  'b0000000-0000-0000-0000-000000000002', 'MOC-2411A', 16, 100, 9),
  ('ROT-PRT-400',  'b0000000-0000-0000-0000-000000000001', 'ROT-2411A', 26,  35, 9)
) as v(sku, loc, kode, qty, hari, masuk)
join products p on p.sku = v.sku
join storage_locations l on l.id = v.loc::uuid;

-- Pesanan pembelian contoh
insert into purchase_orders (id, supplier_id, status, created_at) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'dipesan',  now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'diterima', now() - interval '12 days');

insert into purchase_order_items (po_id, product_id, qty_pesan, qty_diterima, harga_beli)
select 'c0000000-0000-0000-0000-000000000001'::uuid, id, 40, 0, 45000 from products where sku = 'IKN-DOR-500'
union all
select 'c0000000-0000-0000-0000-000000000001'::uuid, id, 20, 0, 70000 from products where sku = 'UDG-KPS-500'
union all
select 'c0000000-0000-0000-0000-000000000002'::uuid, id, 60, 60, 38000 from products where sku = 'AYM-POT-1000';

-- ===== Tahap 2 (ERP): biaya batch + riwayat penjualan 30 hari + penyesuaian stok =====
-- Riwayat disisipkan langsung (bukan lewat checkout) sehingga TIDAK mengubah stok batch di atas.
update batches b set harga_beli = p.harga_beli from products p where p.id = b.product_id;

create temp table seed_trx on commit drop as
select g as i, gen_random_uuid() as id,
       (array['tunai','qris','transfer','tunai'])[1 + g % 4] as metode,
       ((current_date - (1 + g % 30))::text || ' ' || lpad((8 + g % 13)::text, 2, '0') || ':' || lpad(((g * 7) % 60)::text, 2, '0') || ':00+07')::timestamptz as waktu
from generate_series(1, 70) g;

create temp table seed_item on commit drop as
with prod as (
  select p.id, p.harga_jual, p.harga_beli, row_number() over (order by p.sku) as rn,
         (select b.id from batches b where b.product_id = p.id order by b.tgl_kedaluwarsa limit 1) as batch_id
  from products p),
n as (select count(*) as c from prod)
select t.id as sale_id, p.id as product_id, p.batch_id,
       1 + ((t.i + k) % 4) as qty, p.harga_jual, p.harga_beli as hpp_satuan
from seed_trx t
cross join generate_series(0, t.i % 3) k
cross join n
join prod p on p.rn = ((t.i * 3 + k * 5) % n.c) + 1
where p.batch_id is not null;

insert into sales (id, kasir_id, metode, total, bayar, kembalian, idempotency_key, created_at)
select t.id, null, t.metode, x.total,
       case when t.metode = 'tunai' then ceil(x.total / 10000.0) * 10000 else x.total end,
       case when t.metode = 'tunai' then ceil(x.total / 10000.0) * 10000 - x.total else 0 end,
       gen_random_uuid(), t.waktu
from seed_trx t
join (select sale_id, sum(qty * harga_jual) as total from seed_item group by sale_id) x on x.sale_id = t.id;

insert into sale_items (sale_id, product_id, batch_id, qty, harga_jual, hpp_satuan)
select sale_id, product_id, batch_id, qty, harga_jual, hpp_satuan from seed_item;

-- Contoh penyesuaian stok (riwayat): qty_sesudah = qty batch saat ini
insert into stock_adjustments (batch_id, product_id, qty_sebelum, qty_sesudah, alasan, catatan, nilai, created_at)
select b.id, b.product_id, b.qty + v.selisih, b.qty, v.alasan, v.catatan, v.selisih * b.harga_beli,
       now() - (v.hari || ' days')::interval
from (values
  ('SSG-2409A', 4, 'kedaluwarsa', 'Dibuang sebagian karena lewat tanggal', 3),
  ('BKS-2410A', 2, 'rusak', 'Kemasan sobek saat bongkar muat', 6),
  ('ESV-2410A', 3, 'rusak', 'Freezer sempat mati, es krim mencair', 9),
  ('DMP-2410A', 1, 'hilang', 'Selisih saat stok opname', 12),
  ('NGT-2411A', 2, 'rusak', 'Kemasan penyok', 15)
) as v(kode, selisih, alasan, catatan, hari)
join batches b on b.kode_batch = v.kode;

commit;
