-- Toko Asri · Tahap 2: hardening hasil tinjauan akhir.
--  1) checkout: keranjang NULL ditolak.
--  2) kunci idempotensi terikat pada isi transaksi dan kasir (sidik request_hash).
--  3) stok batch hanya berubah lewat RPC: tulis langsung ke batches dicabut (audit dan HPP tidak bisa dilewati).

alter table sales add column request_hash text;

create or replace function checkout(p_items jsonb, p_metode text, p_bayar numeric, p_key uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as
$$
declare
  v_peran peran_enum := current_peran();
  v_hari date := (now() at time zone 'Asia/Jakarta')::date;
  v_sale uuid; v_ada sales%rowtype; v_hash text;
  v_total numeric := 0;
  e jsonb; q numeric;
  r record; b record;
  v_prod products%rowtype;
  v_perlu int; v_ambil int;
begin
  if v_peran is null or v_peran not in ('pemilik', 'kasir') then
    raise exception 'Tidak diizinkan: hanya pemilik atau kasir';
  end if;
  if p_key is null then raise exception 'Kunci transaksi wajib diisi'; end if;
  if p_metode is null or p_metode not in ('tunai', 'qris', 'transfer') then raise exception 'Metode pembayaran tidak valid'; end if;
  if p_bayar is null or p_bayar < 0 then raise exception 'Jumlah bayar tidak valid'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;
  -- validasi tiap baris SEBELUM digabung (agar 0.5 + 0.5 tidak lolos)
  for e in select * from jsonb_array_elements(p_items) loop
    q := (e ->> 'qty')::numeric;
    if q is null or q <= 0 or q <> trunc(q) then raise exception 'Jumlah harus bilangan bulat lebih dari 0'; end if;
  end loop;

  -- sidik isi permintaan (baris digabung dan diurut) agar kunci tidak bisa dipakai ulang untuk isi lain
  v_hash := md5(
    (select string_agg(pid::text || ':' || qty::text, ',' order by pid)
       from (select (x ->> 'product_id')::uuid as pid, sum(trunc((x ->> 'qty')::numeric))::bigint as qty
               from jsonb_array_elements(p_items) x group by 1) t)
    || '|' || p_metode || '|' || round(p_bayar, 2)::text);

  -- idempotensi: kunci sama (termasuk transaksi bersamaan) hanya mengembalikan transaksi yang SAMA isinya dan kasirnya
  insert into sales (metode, total, bayar, kembalian, idempotency_key, request_hash)
  values (p_metode, 0, 0, 0, p_key, v_hash)
  on conflict (idempotency_key) do nothing
  returning id into v_sale;
  if v_sale is null then
    select * into v_ada from sales where idempotency_key = p_key;
    if v_ada.kasir_id is distinct from auth.uid() or v_ada.request_hash is distinct from v_hash then
      raise exception 'Kunci transaksi sudah dipakai untuk transaksi lain';
    end if;
    return v_ada.id;
  end if;

  -- urut menurut product_id agar dua kasir dengan keranjang campuran tidak saling deadlock
  for r in
    select (x ->> 'product_id')::uuid as pid, sum((x ->> 'qty')::int) as qty
    from jsonb_array_elements(p_items) x group by 1 order by 1
  loop
    select * into v_prod from products where id = r.pid and aktif;
    if not found then raise exception 'Produk tidak ditemukan atau nonaktif'; end if;
    v_perlu := r.qty;
    for b in
      select id, qty, harga_beli from batches
      where product_id = r.pid and qty > 0 and tgl_kedaluwarsa > v_hari
      order by tgl_kedaluwarsa, id
      for update
    loop
      exit when v_perlu = 0;
      v_ambil := least(b.qty, v_perlu);
      update batches set qty = qty - v_ambil where id = b.id;
      insert into sale_items (sale_id, product_id, batch_id, qty, harga_jual, hpp_satuan)
      values (v_sale, r.pid, b.id, v_ambil, v_prod.harga_jual, coalesce(b.harga_beli, v_prod.harga_beli));
      v_perlu := v_perlu - v_ambil;
    end loop;
    if v_perlu > 0 then
      raise exception 'Stok % tidak cukup (layak jual tersisa %)', v_prod.nama, r.qty - v_perlu;
    end if;
    v_total := v_total + r.qty * v_prod.harga_jual;
  end loop;

  if p_bayar < v_total then raise exception 'Pembayaran kurang dari total'; end if;
  if p_metode <> 'tunai' and p_bayar <> v_total then raise exception 'Pembayaran non-tunai harus sama dengan total'; end if;
  update sales set total = v_total, bayar = p_bayar, kembalian = p_bayar - v_total where id = v_sale;
  return v_sale;
end $$;

-- batches: hanya baca langsung; perubahan lewat RPC (receive_goods, checkout, adjust_stock)
drop policy if exists batches_tulis on batches;
revoke insert, update, delete, truncate on batches from authenticated;
