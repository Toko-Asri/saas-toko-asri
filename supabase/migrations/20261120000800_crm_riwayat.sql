-- Toko Asri · Tahap 3 (CRM): riwayat belanja dan produk favorit pelanggan.
-- Menampilkan transaksi dari SEMUA kasir untuk satu pelanggan; tabel sales tetap tertutup bagi kasir lain.
create function riwayat_pelanggan(p_customer uuid, p_limit int default 50)
returns table (sale_id uuid, nomor bigint, waktu timestamptz, metode text, total numeric, poin int, jumlah_item bigint)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is null or current_peran() not in ('pemilik', 'kasir') then
    raise exception 'Tidak diizinkan: hanya pemilik atau kasir';
  end if;
  return query
  select s.id, s.nomor, s.created_at, s.metode, s.total, s.poin,
         (select coalesce(sum(si.qty), 0) from sale_items si where si.sale_id = s.id)::bigint
  from sales s
  where s.customer_id = p_customer
  order by s.created_at desc, s.nomor desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;

create function produk_favorit_pelanggan(p_customer uuid, p_limit int default 5)
returns table (product_id uuid, nama text, qty bigint, total numeric)
language plpgsql stable security definer set search_path = public, pg_temp as
$$
#variable_conflict use_column
begin
  if current_peran() is null or current_peran() not in ('pemilik', 'kasir') then
    raise exception 'Tidak diizinkan: hanya pemilik atau kasir';
  end if;
  return query
  select p.id, p.nama, sum(si.qty)::bigint, sum(si.qty * si.harga_jual)
  from sales s
  join sale_items si on si.sale_id = s.id
  join products p on p.id = si.product_id
  where s.customer_id = p_customer
  group by p.id, p.nama
  order by sum(si.qty) desc, p.nama
  limit greatest(1, least(coalesce(p_limit, 5), 50));
end $$;

revoke all on function riwayat_pelanggan(uuid, int), produk_favorit_pelanggan(uuid, int) from public, anon;
grant execute on function riwayat_pelanggan(uuid, int), produk_favorit_pelanggan(uuid, int) to authenticated;
