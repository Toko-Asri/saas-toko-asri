-- Toko Asri · Tahap 4: pemeriksa integritas lintas modul (hanya pemilik).
-- Setiap pemeriksaan mencari data yang tidak konsisten antara SCM, ERP, dan CRM.
create function cek_integritas()
returns table (kode text, nama text, ok boolean, jumlah_masalah int, contoh text)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  return query
  with m as (
    -- ERP -> CRM: poin pelanggan = jumlah poin penjualannya
    select 'poin_pelanggan'::text as kode, 'Poin pelanggan sama dengan jumlah poin penjualannya'::text as nama, c.id::text as ref
    from customers c where c.poin <> coalesce((select sum(s.poin) from sales s where s.customer_id = c.id), 0)
    union all
    -- ERP -> CRM: total belanja dan jumlah transaksi
    select 'belanja_pelanggan', 'Total belanja dan jumlah transaksi pelanggan sama dengan penjualannya', c.id::text
    from customers c
    where c.total_belanja <> coalesce((select sum(s.total) from sales s where s.customer_id = c.id), 0)
       or c.jumlah_transaksi <> (select count(*) from sales s where s.customer_id = c.id)
    union all
    -- CRM: tier sesuai total belanja
    select 'tier_pelanggan', 'Tier pelanggan sesuai total belanja', c.id::text
    from customers c where c.tier <> tier_dari(c.total_belanja)
    union all
    -- ERP: total penjualan = jumlah item
    select 'total_penjualan', 'Total penjualan sama dengan jumlah item (qty x harga jual)', s.id::text
    from sales s where s.total <> coalesce((select sum(si.qty * si.harga_jual) from sale_items si where si.sale_id = s.id), 0)
    union all
    -- SCM/ERP: stok tidak negatif
    select 'stok_negatif', 'Tidak ada batch dengan stok negatif', b.id::text
    from batches b where b.qty < 0
    union all
    -- SCM: penerimaan PO konsisten
    select 'penerimaan_po', 'Penerimaan PO tidak melebihi pesanan dan PO diterima tidak punya sisa', x.po_id::text
    from (
      select i.po_id from purchase_order_items i where i.qty_diterima > i.qty_pesan
      union
      select o.id from purchase_orders o where o.status = 'diterima'
        and exists (select 1 from purchase_order_items i where i.po_id = o.id and i.qty_diterima < i.qty_pesan)
    ) x
    union all
    -- SCM: paling banyak satu saran aktif per produk
    select 'saran_ganda', 'Paling banyak satu saran pembelian aktif per produk', g.product_id::text
    from purchase_suggestions g where g.status in ('terbuka', 'dipesan')
    group by g.product_id having count(*) > 1
  ),
  daftar(kode, nama) as (values
    ('poin_pelanggan', 'Poin pelanggan sama dengan jumlah poin penjualannya'),
    ('belanja_pelanggan', 'Total belanja dan jumlah transaksi pelanggan sama dengan penjualannya'),
    ('tier_pelanggan', 'Tier pelanggan sesuai total belanja'),
    ('total_penjualan', 'Total penjualan sama dengan jumlah item (qty x harga jual)'),
    ('stok_negatif', 'Tidak ada batch dengan stok negatif'),
    ('penerimaan_po', 'Penerimaan PO tidak melebihi pesanan dan PO diterima tidak punya sisa'),
    ('saran_ganda', 'Paling banyak satu saran pembelian aktif per produk'))
  select d.kode, d.nama, count(m.ref) = 0, count(m.ref)::int,
         coalesce((select string_agg(t.ref, ', ') from (select m2.ref from m m2 where m2.kode = d.kode order by m2.ref limit 3) t), '')
  from daftar d left join m on m.kode = d.kode
  group by d.kode, d.nama
  order by d.kode;
end $$;

revoke all on function cek_integritas() from public, anon;
grant execute on function cek_integritas() to authenticated;
