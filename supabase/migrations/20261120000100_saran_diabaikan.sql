-- Perbaikan: saran pembelian yang diabaikan tidak dibuat ulang selama stok masih <= minimum.
-- Saat stok pulih (> minimum), saran yang terbuka/diabaikan ditutup sehingga siklus berikutnya mulai bersih.
create or replace function refresh_suggestion(p_product uuid) returns void
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
    where not exists (select 1 from purchase_suggestions where product_id = p_product and status in ('terbuka', 'dipesan', 'diabaikan'))
    on conflict do nothing;
  elsif v_stock > v_min or not v_aktif then
    update purchase_suggestions set status = 'selesai' where product_id = p_product and status in ('terbuka', 'diabaikan');
  end if;
end $$;
