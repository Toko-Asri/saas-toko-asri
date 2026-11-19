-- Toko Asri · Tahap 4 (Task 7): pelunasan temuan minor Tahap 3 yang menyangkut integritas data.
--  1) Telepon: normalisasi v2 (awalan 00 dibuang, awalan 8 diberi 62) + check format nomor Indonesia di database.
--  2) checkout: kunci idempotensi diperiksa SEBELUM status pelanggan, sehingga kirim ulang setelah pelanggan
--     dinonaktifkan mengembalikan penjualan semula (bukan galat menyesatkan).

create or replace function normalisasi_telepon(p text) returns text
language plpgsql immutable as
$$
declare d text;
begin
  if p is null or btrim(p) = '' then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then raise exception 'Nomor telepon tidak valid'; end if;
  if left(d, 2) = '00' then d := substr(d, 3);                  -- awalan internasional 00
  elsif left(d, 1) = '0' then d := '62' || substr(d, 2);        -- 0812... -> 62812...
  end if;
  if left(d, 1) = '8' then d := '62' || d; end if;              -- 812... -> 62812...
  return d;
end $$;

-- Data lama: normalkan ulang. Nomor yang tidak valid atau bentrok dengan nomor lain dikosongkan,
-- tetapi nilai lamanya disimpan di catatan agar tidak ada informasi yang hilang.
with n as (
  select id, telepon as lama, normalisasi_telepon(telepon) as baru from customers where telepon is not null
)
update customers c
   set telepon = case when n.baru ~ '^62[0-9]{6,13}$'
                       and not exists (select 1 from customers o where o.id <> c.id and o.telepon = n.baru)
                      then n.baru else null end,
       catatan = case when n.baru ~ '^62[0-9]{6,13}$'
                       and not exists (select 1 from customers o where o.id <> c.id and o.telepon = n.baru)
                      then c.catatan
                      else concat_ws(' · ', nullif(c.catatan, ''), 'telepon lama: ' || n.lama) end
  from n
 where n.id = c.id and (n.baru is distinct from n.lama or n.baru !~ '^62[0-9]{6,13}$');

alter table customers add constraint customers_telepon_format check (telepon is null or telepon ~ '^62[0-9]{6,13}$');

create or replace function checkout(p_items jsonb, p_metode text, p_bayar numeric, p_key uuid, p_customer uuid default null) returns uuid
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
  for e in select * from jsonb_array_elements(p_items) loop
    q := (e ->> 'qty')::numeric;
    if q is null or q <= 0 or q <> trunc(q) then raise exception 'Jumlah harus bilangan bulat lebih dari 0'; end if;
  end loop;

  -- sidik isi permintaan (baris digabung dan diurut) + pelanggan
  v_hash := md5(
    (select string_agg(pid::text || ':' || qty::text, ',' order by pid)
       from (select (x ->> 'product_id')::uuid as pid, sum(trunc((x ->> 'qty')::numeric))::bigint as qty
               from jsonb_array_elements(p_items) x group by 1) t)
    || '|' || p_metode || '|' || round(p_bayar, 2)::text || '|' || coalesce(p_customer::text, ''));

  -- Idempotensi DULU (sebelum status pelanggan): kirim ulang transaksi yang sudah tercatat mengembalikan
  -- penjualan itu, walau pelanggannya kini nonaktif. Kunci yang sama dengan isi/kasir berbeda ditolak.
  select * into v_ada from sales where idempotency_key = p_key;
  if found then
    if v_ada.kasir_id is distinct from auth.uid() or v_ada.request_hash is distinct from v_hash then
      raise exception 'Kunci transaksi sudah dipakai untuk transaksi lain';
    end if;
    return v_ada.id;
  end if;

  -- Kunci baris pelanggan sebelum batch (penjualan bersamaan ke pelanggan yang sama diserialkan).
  if p_customer is not null then
    perform 1 from customers where id = p_customer and aktif for update;
    if not found then
      -- transaksi bersamaan dengan kunci sama mungkin baru saja selesai: periksa ulang sebelum menolak
      select * into v_ada from sales where idempotency_key = p_key;
      if found and v_ada.kasir_id is not distinct from auth.uid() and v_ada.request_hash is not distinct from v_hash then
        return v_ada.id;
      end if;
      raise exception 'Pelanggan tidak ditemukan atau nonaktif';
    end if;
  end if;

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
