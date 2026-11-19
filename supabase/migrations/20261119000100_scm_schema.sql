-- Toko Asri · Tahap 1 (SCM): skema, RLS, trigger saran pembelian, RPC.

create type peran_enum as enum ('pemilik', 'kasir', 'staf_gudang');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  peran peran_enum not null
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kontak text,
  telepon text,
  alamat text,
  aktif boolean not null default true
);

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tipe text not null check (tipe in ('freezer', 'chiller', 'kering')),
  suhu_min numeric,
  suhu_maks numeric
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nama text not null,
  satuan text not null default 'pcs',
  supplier_id uuid references suppliers (id),
  harga_beli numeric not null default 0 check (harga_beli >= 0),
  harga_jual numeric not null default 0 check (harga_jual >= 0),
  min_stock int not null default 0 check (min_stock >= 0),
  reorder_qty int not null default 1 check (reorder_qty > 0),
  aktif boolean not null default true
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  location_id uuid not null references storage_locations (id),
  kode_batch text not null,
  qty int not null check (qty >= 0),
  tgl_kedaluwarsa date not null,
  tgl_masuk date not null default current_date,
  unique (product_id, kode_batch)
);
create index on batches (product_id);
create index on batches (tgl_kedaluwarsa);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id),
  status text not null default 'draft' check (status in ('draft', 'dipesan', 'diterima', 'dibatalkan')),
  dibuat_oleh uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid not null references products (id),
  qty_pesan int not null check (qty_pesan > 0),
  qty_diterima int not null default 0 check (qty_diterima >= 0 and qty_diterima <= qty_pesan),
  harga_beli numeric not null default 0 check (harga_beli >= 0)
);
create index on purchase_order_items (po_id);

create table purchase_suggestions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  qty_disarankan int not null check (qty_disarankan > 0),
  status text not null default 'terbuka' check (status in ('terbuka', 'dipesan', 'diabaikan', 'selesai')),
  po_id uuid references purchase_orders (id),
  created_at timestamptz not null default now()
);
create unique index one_open_suggestion on purchase_suggestions (product_id) where status in ('terbuka', 'dipesan');

-- ---------- Peran ----------
create function current_peran() returns peran_enum
language sql stable security definer set search_path = public as
$$ select peran from profiles where id = auth.uid() $$;

create function require_gudang() returns void
language plpgsql stable security definer set search_path = public as
$$ begin
  if current_peran() is null or current_peran() not in ('pemilik', 'staf_gudang') then
    raise exception 'Tidak diizinkan: hanya pemilik atau staf gudang';
  end if;
end $$;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table storage_locations enable row level security;
alter table products enable row level security;
alter table batches enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table purchase_suggestions enable row level security;

create policy profiles_baca on profiles for select using (id = auth.uid() or current_peran() = 'pemilik');
create policy profiles_tulis on profiles for all using (current_peran() = 'pemilik') with check (current_peran() = 'pemilik');

-- baca oleh semua peran yang punya profil; tulis oleh pemilik/staf gudang
create policy products_baca on products for select using (current_peran() is not null);
create policy locations_baca on storage_locations for select using (current_peran() is not null);
create policy batches_baca on batches for select using (current_peran() is not null);
create policy products_tulis on products for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));
create policy locations_tulis on storage_locations for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));
create policy batches_tulis on batches for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));

-- hanya pemilik/staf gudang
create policy suppliers_semua on suppliers for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));
create policy po_semua on purchase_orders for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));
create policy po_items_semua on purchase_order_items for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));
create policy saran_semua on purchase_suggestions for all using (current_peran() in ('pemilik', 'staf_gudang')) with check (current_peran() in ('pemilik', 'staf_gudang'));

grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------- Saran pembelian ----------
create function refresh_suggestion(p_product uuid) returns void
language plpgsql security definer set search_path = public as
$$
declare v_stock int; v_min int; v_reorder int; v_aktif boolean;
begin
  select min_stock, reorder_qty, aktif into v_min, v_reorder, v_aktif from products where id = p_product;
  if not found then return; end if;
  select coalesce(sum(qty), 0) into v_stock from batches where product_id = p_product;
  if v_aktif and v_stock <= v_min then
    insert into purchase_suggestions (product_id, qty_disarankan)
    select p_product, v_reorder
    where not exists (select 1 from purchase_suggestions where product_id = p_product and status in ('terbuka', 'dipesan'));
  elsif v_stock > v_min or not v_aktif then
    update purchase_suggestions set status = 'selesai' where product_id = p_product and status = 'terbuka';
  end if;
end $$;

create function trg_batches_saran() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if tg_op <> 'INSERT' then perform refresh_suggestion(old.product_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.product_id <> old.product_id) then perform refresh_suggestion(new.product_id); end if;
  return null;
end $$;
create trigger batches_saran after insert or update or delete on batches
  for each row execute function trg_batches_saran();

create function trg_products_saran() returns trigger
language plpgsql security definer set search_path = public as
$$ begin perform refresh_suggestion(new.id); return null; end $$;
create trigger products_saran after insert or update of min_stock, reorder_qty, aktif on products
  for each row execute function trg_products_saran();

-- ---------- RPC ----------
create function create_po(p_supplier uuid, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as
$$
declare v_po uuid; it jsonb; v_prod products%rowtype; v_qty int;
begin
  perform require_gudang();
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'PO harus memiliki minimal satu item';
  end if;
  insert into purchase_orders (supplier_id) values (p_supplier) returning id into v_po;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'qty')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Jumlah pesan harus lebih dari 0'; end if;
    select * into v_prod from products where id = (it ->> 'product_id')::uuid;
    if not found then raise exception 'Produk tidak ditemukan'; end if;
    if v_prod.supplier_id is distinct from p_supplier then raise exception 'Produk % bukan dari pemasok ini', v_prod.nama; end if;
    insert into purchase_order_items (po_id, product_id, qty_pesan, harga_beli)
    values (v_po, v_prod.id, v_qty, coalesce((it ->> 'harga_beli')::numeric, v_prod.harga_beli));
  end loop;
  return v_po;
end $$;

create function create_po_from_suggestion(p_suggestion uuid) returns uuid
language plpgsql security definer set search_path = public as
$$
declare v_s purchase_suggestions%rowtype; v_prod products%rowtype; v_po uuid;
begin
  perform require_gudang();
  select * into v_s from purchase_suggestions where id = p_suggestion for update;
  if not found or v_s.status <> 'terbuka' then raise exception 'Saran tidak ditemukan atau sudah diproses'; end if;
  select * into v_prod from products where id = v_s.product_id;
  if v_prod.supplier_id is null then raise exception 'Produk % belum memiliki pemasok', v_prod.nama; end if;
  v_po := create_po(v_prod.supplier_id, jsonb_build_array(jsonb_build_object(
    'product_id', v_prod.id, 'qty', v_s.qty_disarankan, 'harga_beli', v_prod.harga_beli)));
  update purchase_suggestions set status = 'dipesan', po_id = v_po where id = p_suggestion;
  return v_po;
end $$;

create function receive_goods(p_po uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as
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
    if (it ->> 'tgl_kedaluwarsa') is null or (it ->> 'tgl_kedaluwarsa')::date < current_date then
      raise exception 'Tanggal kedaluwarsa wajib diisi dan tidak boleh sudah lewat';
    end if;
    insert into batches (product_id, location_id, kode_batch, qty, tgl_kedaluwarsa)
    values (v_item.product_id, (it ->> 'location_id')::uuid, it ->> 'kode_batch', v_qty, (it ->> 'tgl_kedaluwarsa')::date);
    update purchase_order_items set qty_diterima = qty_diterima + v_qty where id = v_item.id;
  end loop;
  if not exists (select 1 from purchase_order_items where po_id = p_po and qty_diterima < qty_pesan) then
    update purchase_orders set status = 'diterima' where id = p_po;
    update purchase_suggestions set status = 'selesai' where po_id = p_po and status = 'dipesan';
  end if;
end $$;

-- Pembatalan PO: tolak bila sudah ada barang diterima; saran terkait kembali terbuka.
create function trg_po_batal() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  if new.status = 'dibatalkan' and old.status <> 'dibatalkan' then
    if exists (select 1 from purchase_order_items where po_id = new.id and qty_diterima > 0) then
      raise exception 'PO yang sudah menerima barang tidak dapat dibatalkan';
    end if;
    update purchase_suggestions set status = 'terbuka', po_id = null where po_id = new.id and status = 'dipesan';
  end if;
  return null;
end $$;
create trigger po_batal after update of status on purchase_orders
  for each row execute function trg_po_batal();

revoke all on function require_gudang(), refresh_suggestion(uuid), trg_po_batal() from public, anon, authenticated;
revoke all on function current_peran(),
  create_po(uuid, jsonb), create_po_from_suggestion(uuid), receive_goods(uuid, jsonb) from public, anon;
grant execute on function current_peran(), create_po(uuid, jsonb), create_po_from_suggestion(uuid), receive_goods(uuid, jsonb) to authenticated;
