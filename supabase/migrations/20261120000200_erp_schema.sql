-- Toko Asri · Tahap 2 (ERP): biaya per batch, penjualan, penyesuaian stok, RLS.

alter table batches add column harga_beli numeric check (harga_beli >= 0);
update batches b set harga_beli = p.harga_beli from products p where p.id = b.product_id and b.harga_beli is null;

create table sales (
  id uuid primary key default gen_random_uuid(),
  nomor bigint generated always as identity,
  kasir_id uuid default auth.uid(),
  metode text not null check (metode in ('tunai', 'qris', 'transfer')),
  total numeric not null check (total >= 0),
  bayar numeric not null check (bayar >= 0),
  kembalian numeric not null check (kembalian >= 0),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);
create index on sales (created_at);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid not null references products (id),
  batch_id uuid not null references batches (id),
  qty int not null check (qty > 0),
  harga_jual numeric not null check (harga_jual >= 0),
  hpp_satuan numeric not null check (hpp_satuan >= 0)
);
create index on sale_items (sale_id);

create table stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id),
  product_id uuid not null references products (id),
  qty_sebelum int not null check (qty_sebelum >= 0),
  qty_sesudah int not null check (qty_sesudah >= 0),
  alasan text not null check (alasan in ('rusak', 'kedaluwarsa', 'hilang', 'koreksi')),
  catatan text,
  nilai numeric not null default 0,
  dibuat_oleh uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on stock_adjustments (created_at);

alter table sales enable row level security;
alter table sale_items enable row level security;
alter table stock_adjustments enable row level security;

create policy sales_baca on sales for select
  using (current_peran() = 'pemilik' or (current_peran() = 'kasir' and kasir_id = auth.uid()));
-- subquery ke sales ikut dibatasi RLS-nya sendiri (invoker)
create policy sale_items_baca on sale_items for select
  using (exists (select 1 from sales s where s.id = sale_id));
create policy adjustments_baca on stock_adjustments for select
  using (current_peran() in ('pemilik', 'staf_gudang'));

-- hanya baca langsung; perubahan lewat RPC (checkout, adjust_stock)
revoke all on sales, sale_items, stock_adjustments from anon;
revoke insert, update, delete on sales, sale_items, stock_adjustments from authenticated;
grant select on sales, sale_items, stock_adjustments to authenticated;

-- stok layak jual per produk: batch yang belum kedaluwarsa (tanggal kalender WIB)
create view stok_layak with (security_invoker = true) as
  select product_id, sum(qty)::int as stok
  from batches
  where qty > 0 and tgl_kedaluwarsa > (now() at time zone 'Asia/Jakarta')::date
  group by product_id;
grant select on stok_layak to authenticated;

-- receive_goods v2: menyimpan biaya per unit batch dari harga item PO
create or replace function receive_goods(p_po uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as
$$
declare v_po purchase_orders%rowtype; it jsonb; v_item purchase_order_items%rowtype; v_qty int;
begin
  perform require_gudang();
  select * into v_po from purchase_orders where id = p_po for update;
  if not found then raise exception 'PO tidak ditemukan'; end if;
  if v_po.status <> 'dipesan' then raise exception 'PO harus berstatus dipesan untuk menerima barang'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tidak ada item yang diterima';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'qty')::int;
    select * into v_item from purchase_order_items
      where id = (it ->> 'item_id')::uuid and po_id = p_po for update;
    if not found then raise exception 'Item bukan bagian dari PO ini'; end if;
    if v_qty is null or v_qty <= 0 then raise exception 'Jumlah diterima harus lebih dari 0'; end if;
    if v_qty > v_item.qty_pesan - v_item.qty_diterima then
      raise exception 'Jumlah diterima melebihi sisa pesanan (sisa %)', v_item.qty_pesan - v_item.qty_diterima;
    end if;
    if (it ->> 'tgl_kedaluwarsa') is null
       or (it ->> 'tgl_kedaluwarsa')::date <= (now() at time zone 'Asia/Jakarta')::date then
      raise exception 'Tanggal kedaluwarsa wajib diisi dan harus setelah hari ini (WIB)';
    end if;
    insert into batches (product_id, location_id, kode_batch, qty, tgl_kedaluwarsa, harga_beli)
    values (v_item.product_id, (it ->> 'location_id')::uuid, it ->> 'kode_batch', v_qty, (it ->> 'tgl_kedaluwarsa')::date, v_item.harga_beli);
    update purchase_order_items set qty_diterima = qty_diterima + v_qty where id = v_item.id;
  end loop;
  if not exists (select 1 from purchase_order_items where po_id = p_po and qty_diterima < qty_pesan) then
    update purchase_orders set status = 'diterima' where id = p_po;
    update purchase_suggestions set status = 'selesai' where po_id = p_po and status = 'dipesan';
    perform refresh_suggestion(product_id) from purchase_order_items where po_id = p_po;
  end if;
end $$;
