-- Toko Asri · Tahap 2 (ERP): penyesuaian stok dan laporan keuangan.
create function adjust_stock(p_batch uuid, p_qty_baru int, p_alasan text, p_catatan text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as
$$
declare v_b batches%rowtype; v_biaya numeric;
begin
  perform require_gudang();
  if p_qty_baru is null or p_qty_baru < 0 then raise exception 'Jumlah baru harus bilangan bulat ≥ 0'; end if;
  if p_alasan is null or p_alasan not in ('rusak', 'kedaluwarsa', 'hilang', 'koreksi') then raise exception 'Alasan penyesuaian tidak valid'; end if;
  select * into v_b from batches where id = p_batch for update;
  if not found then raise exception 'Batch tidak ditemukan'; end if;
  if p_qty_baru = v_b.qty then raise exception 'Jumlah baru sama dengan jumlah saat ini'; end if;
  if p_qty_baru > v_b.qty and p_alasan <> 'koreksi' then
    raise exception 'Penambahan stok hanya boleh dengan alasan koreksi';
  end if;
  select coalesce(v_b.harga_beli, harga_beli) into v_biaya from products where id = v_b.product_id;
  update batches set qty = p_qty_baru where id = p_batch;
  insert into stock_adjustments (batch_id, product_id, qty_sebelum, qty_sesudah, alasan, catatan, nilai)
  values (p_batch, v_b.product_id, v_b.qty, p_qty_baru, p_alasan, nullif(trim(p_catatan), ''), (v_b.qty - p_qty_baru) * v_biaya);
end $$;

create function laporan_keuangan(p_dari date, p_sampai date)
returns table (tanggal date, jumlah_transaksi int, penjualan numeric, hpp numeric, laba_kotor numeric, kerugian_stok numeric)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then raise exception 'Rentang tanggal tidak valid'; end if;
  if p_sampai - p_dari > 365 then raise exception 'Rentang laporan maksimal 366 hari'; end if;
  return query
  with hari as (select d::date as tgl from generate_series(p_dari, p_sampai, interval '1 day') d),
  jual as (
    select (created_at at time zone 'Asia/Jakarta')::date as tgl, count(*)::int as n, sum(total) as pj
    from sales where (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by 1),
  biaya as (
    select (sa.created_at at time zone 'Asia/Jakarta')::date as tgl, sum(si.qty * si.hpp_satuan) as h
    from sale_items si join sales sa on sa.id = si.sale_id
    where (sa.created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by 1),
  rugi as (
    select (created_at at time zone 'Asia/Jakarta')::date as tgl, sum(nilai) as r
    from stock_adjustments where nilai > 0 and (created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai group by 1)
  select hari.tgl, coalesce(jual.n, 0), coalesce(jual.pj, 0), coalesce(biaya.h, 0),
         coalesce(jual.pj, 0) - coalesce(biaya.h, 0), coalesce(rugi.r, 0)
  from hari left join jual on jual.tgl = hari.tgl left join biaya on biaya.tgl = hari.tgl left join rugi on rugi.tgl = hari.tgl
  order by hari.tgl;
end $$;

create function laporan_produk(p_dari date, p_sampai date)
returns table (product_id uuid, nama text, qty_terjual bigint, penjualan numeric, hpp numeric, laba_kotor numeric)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is distinct from 'pemilik' then raise exception 'Tidak diizinkan: hanya pemilik'; end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then raise exception 'Rentang tanggal tidak valid'; end if;
  if p_sampai - p_dari > 365 then raise exception 'Rentang laporan maksimal 366 hari'; end if;
  return query
  select p.id, p.nama, sum(si.qty)::bigint, sum(si.qty * si.harga_jual), sum(si.qty * si.hpp_satuan),
         sum(si.qty * (si.harga_jual - si.hpp_satuan))
  from sale_items si join sales sa on sa.id = si.sale_id join products p on p.id = si.product_id
  where (sa.created_at at time zone 'Asia/Jakarta')::date between p_dari and p_sampai
  group by p.id, p.nama
  order by sum(si.qty * (si.harga_jual - si.hpp_satuan)) desc, p.nama;
end $$;

revoke all on function adjust_stock(uuid, int, text, text), laporan_keuangan(date, date), laporan_produk(date, date) from public, anon;
grant execute on function adjust_stock(uuid, int, text, text), laporan_keuangan(date, date), laporan_produk(date, date) to authenticated;
