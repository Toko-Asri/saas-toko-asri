-- Toko Asri · Tahap 3 (CRM): checkout v3. Pelanggan opsional; poin, total belanja, dan tier
-- diperbarui dalam transaksi database yang sama dengan penjualan.
drop function checkout(jsonb, text, numeric, uuid);

create function checkout(p_items jsonb, p_metode text, p_bayar numeric, p_key uuid, p_customer uuid default null) returns uuid
language plpgsql security definer set search_path = public, pg_temp as
$$
declare
  v_peran peran_enum := current_peran();
  v_hari date := (now() at time zone 'Asia/Jakarta')::date;
  v_sale uuid; v_ada sales%rowtype; v_hash text;
  v_total numeric := 0; v_poin int;
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

  -- Kunci baris pelanggan PERTAMA (sebelum batch): penjualan bersamaan ke pelanggan yang sama diserialkan
  -- sehingga hitungan tidak hilang, dan kirim ulang berkunci sama menunggu lalu melihat transaksi yang sudah ada.
  if p_customer is not null then
    perform 1 from customers where id = p_customer and aktif for update;
    if not found then raise exception 'Pelanggan tidak ditemukan atau nonaktif'; end if;
  end if;

  -- sidik isi permintaan (baris digabung dan diurut) + pelanggan
  v_hash := md5(
    (select string_agg(pid::text || ':' || qty::text, ',' order by pid)
       from (select (x ->> 'product_id')::uuid as pid, sum(trunc((x ->> 'qty')::numeric))::bigint as qty
               from jsonb_array_elements(p_items) x group by 1) t)
    || '|' || p_metode || '|' || round(p_bayar, 2)::text || '|' || coalesce(p_customer::text, ''));

  insert into sales (metode, total, bayar, kembalian, idempotency_key, request_hash, customer_id)
  values (p_metode, 0, 0, 0, p_key, v_hash, p_customer)
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

  v_poin := case when p_customer is null then 0 else poin_dari(v_total) end;
  update sales set total = v_total, bayar = p_bayar, kembalian = p_bayar - v_total, poin = v_poin where id = v_sale;
  if p_customer is not null then
    update customers
       set poin = poin + v_poin,
           total_belanja = total_belanja + v_total,
           jumlah_transaksi = jumlah_transaksi + 1,
           terakhir_belanja = now(),
           tier = tier_dari(total_belanja + v_total)
     where id = p_customer;
  end if;
  return v_sale;
end $$;

revoke all on function checkout(jsonb, text, numeric, uuid, uuid) from public, anon;
grant execute on function checkout(jsonb, text, numeric, uuid, uuid) to authenticated;
