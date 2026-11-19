-- Toko Asri · Tahap 3 (CRM): pelanggan, poin, tier, segmentasi.

-- Aturan loyalitas (sumber tunggal; dicerminkan di src/lib/loyalty.ts dan diuji dengan angka yang sama):
--   1 poin per Rp10.000 (dibulatkan ke bawah per transaksi); tier dari total belanja kumulatif.
create function poin_dari(p_total numeric) returns int
language sql immutable as $$ select greatest(floor(coalesce(p_total, 0) / 10000), 0)::int $$;

create function tier_dari(p_total_belanja numeric) returns text
language sql immutable as
$$ select case when coalesce(p_total_belanja, 0) >= 2000000 then 'gold'
               when coalesce(p_total_belanja, 0) >= 500000 then 'silver'
               else 'reguler' end $$;

-- Telepon: hanya digit, awalan 0 -> 62 ('+' dan pemisah dibuang). Kosong -> null.
create function normalisasi_telepon(p text) returns text
language plpgsql immutable as
$$
declare d text;
begin
  if p is null or btrim(p) = '' then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then raise exception 'Nomor telepon tidak valid'; end if;
  if left(d, 1) = '0' then d := '62' || substr(d, 2); end if;
  return d;
end $$;

create table customers (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (btrim(nama) <> ''),
  telepon text,
  email text,
  alamat text,
  catatan text,
  aktif boolean not null default true,
  tgl_daftar timestamptz not null default now(),
  poin int not null default 0 check (poin >= 0),
  total_belanja numeric not null default 0 check (total_belanja >= 0),
  jumlah_transaksi int not null default 0 check (jumlah_transaksi >= 0),
  terakhir_belanja timestamptz,
  tier text not null default 'reguler' check (tier in ('reguler', 'silver', 'gold'))
);
create unique index customers_telepon_uq on customers (telepon);   -- null boleh banyak
create index on customers (tier);

create function trg_customers_telepon() returns trigger
language plpgsql as $$ begin new.telepon := normalisasi_telepon(new.telepon); return new; end $$;
create trigger customers_telepon before insert or update of telepon on customers
  for each row execute function trg_customers_telepon();

alter table sales add column customer_id uuid references customers (id);
alter table sales add column poin int not null default 0 check (poin >= 0);
create index on sales (customer_id);

alter table customers enable row level security;
create policy customers_baca on customers for select using (current_peran() in ('pemilik', 'kasir'));
create policy customers_tambah on customers for insert with check (current_peran() in ('pemilik', 'kasir'));
create policy customers_ubah on customers for update
  using (current_peran() in ('pemilik', 'kasir')) with check (current_peran() in ('pemilik', 'kasir'));

-- Hak per kolom: kolom hitungan (poin, total_belanja, jumlah_transaksi, terakhir_belanja, tier, tgl_daftar)
-- hanya berubah lewat RPC checkout; tanpa delete (pelanggan dinonaktifkan, bukan dihapus).
revoke all on customers from authenticated, anon;
grant select on customers to authenticated;
grant insert (nama, telepon, email, alamat, catatan) on customers to authenticated;
grant update (nama, telepon, email, alamat, catatan, aktif) on customers to authenticated;

-- Segmentasi (hanya pemilik): tier x aktivitas, tanggal kalender WIB.
create view pelanggan_segmen with (security_invoker = true) as
select c.id, c.nama, c.telepon, c.tier, c.poin, c.total_belanja, c.jumlah_transaksi, c.terakhir_belanja, c.tgl_daftar,
       h.sejak_belanja as hari_sejak_belanja,
       case when c.terakhir_belanja is null then (case when h.sejak_daftar <= 30 then 'baru' else 'tidak_aktif' end)
            when h.sejak_belanja <= 30 then 'aktif'
            when h.sejak_belanja <= 90 then 'berisiko'
            else 'tidak_aktif' end as aktivitas
from customers c
cross join lateral (
  select (now() at time zone 'Asia/Jakarta')::date - (c.tgl_daftar at time zone 'Asia/Jakarta')::date as sejak_daftar,
         case when c.terakhir_belanja is null then null
              else (now() at time zone 'Asia/Jakarta')::date - (c.terakhir_belanja at time zone 'Asia/Jakarta')::date end as sejak_belanja
) h
where c.aktif and current_peran() = 'pemilik';
grant select on pelanggan_segmen to authenticated;
