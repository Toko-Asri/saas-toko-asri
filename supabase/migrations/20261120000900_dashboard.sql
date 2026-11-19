-- Toko Asri · Tahap 4: RPC dashboard. Angka dihitung di database (sumber tunggal) dan diuji cocok
-- dengan laporan_keuangan / laporan_produk / stok_layak.

create function dashboard_ringkasan(p_dari date, p_sampai date)
returns table (penjualan numeric, hpp numeric, laba_kotor numeric, transaksi int, transaksi_member int, rata_transaksi numeric,
               kerugian_stok numeric, penjualan_sebelumnya numeric, laba_sebelumnya numeric, transaksi_sebelumnya int, pelanggan_baru int)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
declare v_n int; v_ps date; v_pd date;
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then raise exception 'Rentang tanggal tidak valid'; end if;
  if p_sampai - p_dari > 365 then raise exception 'Rentang maksimal 366 hari'; end if;
  v_n := p_sampai - p_dari + 1;
  v_ps := p_dari - 1;          -- pembanding: periode sebelumnya dengan jumlah hari yang sama
  v_pd := p_dari - v_n;
  return query
  with s as (
    select sa.total, sa.customer_id, (sa.created_at at time zone 'Asia/Jakarta')::date as tgl,
           coalesce((select sum(si.qty * si.hpp_satuan) from sale_items si where si.sale_id = sa.id), 0) as biaya
    from sales sa
    where (sa.created_at at time zone 'Asia/Jakarta')::date between v_pd and p_sampai)
  select
    coalesce(sum(s.total) filter (where s.tgl >= p_dari), 0),
    coalesce(sum(s.biaya) filter (where s.tgl >= p_dari), 0),
    coalesce(sum(s.total - s.biaya) filter (where s.tgl >= p_dari), 0),
    (count(*) filter (where s.tgl >= p_dari))::int,
    (count(*) filter (where s.tgl >= p_dari and s.customer_id is not null))::int,
    case when count(*) filter (where s.tgl >= p_dari) = 0 then 0::numeric
         else round(sum(s.total) filter (where s.tgl >= p_dari) / (count(*) filter (where s.tgl >= p_dari)), 2) end,
    (select coalesce(sum(sa2.nilai), 0) from stock_adjustments sa2
      where sa2.nilai > 0 and (sa2.created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai),
    coalesce(sum(s.total) filter (where s.tgl <= v_ps), 0),
    coalesce(sum(s.total - s.biaya) filter (where s.tgl <= v_ps), 0),
    (count(*) filter (where s.tgl <= v_ps))::int,
    (select count(*)::int from customers c where (c.tgl_daftar at time zone 'Asia/Jakarta')::date between p_dari and p_sampai)
  from s;
end $$;

create function dashboard_stok()
returns table (nilai_persediaan numeric, nilai_kedaluwarsa numeric, produk_aktif int, produk_di_bawah_minimum int, produk_habis int,
               saran_terbuka int, batch_hampir_kedaluwarsa int, nilai_hampir_kedaluwarsa numeric, batch_kedaluwarsa int,
               po_menunggu int, nilai_po_menunggu numeric)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
declare v_peran peran_enum := current_peran(); v_hari date := (now() at time zone 'Asia/Jakarta')::date; v_pemilik boolean;
begin
  if v_peran is null or v_peran not in ('pemilik', 'staf_gudang') then raise exception 'Tidak diizinkan: hanya pemilik atau staf gudang'; end if;
  v_pemilik := v_peran = 'pemilik';
  return query
  with b as (
    select ba.product_id, ba.qty, ba.tgl_kedaluwarsa, ba.qty * coalesce(ba.harga_beli, p.harga_beli) as nilai
    from batches ba join products p on p.id = ba.product_id where ba.qty > 0),
  stok as (
    select p.id, p.min_stock,
           coalesce((select sum(ba.qty) from batches ba where ba.product_id = p.id), 0) as total,
           coalesce((select sum(ba.qty) from batches ba where ba.product_id = p.id and ba.qty > 0 and ba.tgl_kedaluwarsa > v_hari), 0) as layak
    from products p where p.aktif),
  po as (
    select count(distinct o.id)::int as n, coalesce(sum((i.qty_pesan - i.qty_diterima) * i.harga_beli), 0) as nilai
    from purchase_orders o left join purchase_order_items i on i.po_id = o.id where o.status = 'dipesan')
  select
    case when v_pemilik then (select coalesce(sum(b.nilai), 0) from b where b.tgl_kedaluwarsa > v_hari) end,
    case when v_pemilik then (select coalesce(sum(b.nilai), 0) from b where b.tgl_kedaluwarsa <= v_hari) end,
    (select count(*)::int from stok),
    (select count(*)::int from stok where stok.total <= stok.min_stock),
    (select count(*)::int from stok where stok.layak = 0),
    (select count(*)::int from purchase_suggestions where status = 'terbuka'),
    (select count(*)::int from b where b.tgl_kedaluwarsa > v_hari and b.tgl_kedaluwarsa <= v_hari + 14),
    case when v_pemilik then (select coalesce(sum(b.nilai), 0) from b where b.tgl_kedaluwarsa > v_hari and b.tgl_kedaluwarsa <= v_hari + 14) end,
    (select count(*)::int from b where b.tgl_kedaluwarsa <= v_hari),
    (select po.n from po),
    case when v_pemilik then (select po.nilai from po) end;
end $$;

create function pelanggan_teratas(p_dari date, p_sampai date, p_limit int default 5)
returns table (customer_id uuid, nama text, tier text, transaksi int, belanja numeric, poin int)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then raise exception 'Rentang tanggal tidak valid'; end if;
  if p_sampai - p_dari > 365 then raise exception 'Rentang maksimal 366 hari'; end if;
  return query
  select c.id, c.nama, c.tier, count(*)::int, sum(s.total), coalesce(sum(s.poin), 0)::int
  from sales s join customers c on c.id = s.customer_id
  where (s.created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai
  group by c.id, c.nama, c.tier
  order by sum(s.total) desc, c.nama
  limit greatest(1, least(coalesce(p_limit, 5), 50));
end $$;

create function aktivitas_terbaru(p_limit int default 15)
returns table (waktu timestamptz, jenis text, judul text, rincian text, tautan text)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  return query
  select a.waktu, a.jenis, a.judul, a.rincian, a.tautan from (
    select s.created_at as waktu, 'penjualan'::text as jenis, ('Penjualan #' || s.nomor)::text as judul,
           ('Rp' || replace(to_char(s.total, 'FM999,999,999,999'), ',', '.')
              || ' · ' || coalesce(c.nama, 'tamu')
              || case when s.customer_id is not null then ' · +' || s.poin || ' poin' else '' end)::text as rincian,
           ('/kasir/riwayat/' || s.id)::text as tautan
    from sales s left join customers c on c.id = s.customer_id
    union all
    select sa.created_at, 'penyesuaian_stok', 'Penyesuaian stok: ' || sa.alasan,
           p.nama || ' · ' || sa.qty_sebelum || ' → ' || sa.qty_sesudah, '/gudang/penyesuaian'
    from stock_adjustments sa join products p on p.id = sa.product_id
    union all
    select g.created_at, 'saran_pembelian', 'Saran pembelian: ' || p.nama,
           'Disarankan pesan ' || g.qty_disarankan || ' · ' || g.status, '/gudang/saran'
    from purchase_suggestions g join products p on p.id = g.product_id
    where g.status <> 'selesai' or g.po_id is not null   -- saran tertutup otomatis tanpa PO hanyalah derau
    union all
    select o.created_at, 'po_dibuat', 'PO ke ' || sp.nama,
           o.status || ' · ' || (select count(*) from purchase_order_items i where i.po_id = o.id) || ' item', '/gudang/pembelian/' || o.id
    from purchase_orders o join suppliers sp on sp.id = o.supplier_id
    union all
    select c.tgl_daftar, 'pelanggan_baru', 'Pelanggan baru: ' || c.nama, coalesce(c.telepon, '–'), '/pelanggan/' || c.id
    from customers c
  ) a
  order by a.waktu desc
  limit greatest(1, least(coalesce(p_limit, 15), 50));
end $$;

revoke all on function dashboard_ringkasan(date, date), dashboard_stok(), pelanggan_teratas(date, date, int), aktivitas_terbaru(int) from public, anon;
grant execute on function dashboard_ringkasan(date, date), dashboard_stok(), pelanggan_teratas(date, date, int), aktivitas_terbaru(int) to authenticated;
