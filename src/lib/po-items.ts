export type ItemPo = { product_id: string; qty: number; harga_beli: number | null }

// Membaca baris produk dari form PO baru (field qty_<id> dan harga_<id>).
// Harga kosong -> null, sehingga database memakai harga beli produk (bukan Rp0).
export function parseItemsPo(fd: FormData): { items?: ItemPo[]; error?: string } {
  const items: ItemPo[] = []
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith('qty_')) continue
    const mentah = String(v).trim()
    if (mentah === '' || Number(mentah) === 0) continue
    const qty = Number(mentah)
    if (!Number.isInteger(qty) || qty < 0) return { error: 'Jumlah pesan harus bilangan bulat positif' }
    const id = k.slice(4)
    const h = String(fd.get('harga_' + id) ?? '').trim()
    const harga = h === '' ? null : Number(h)
    if (harga !== null && !(harga >= 0)) return { error: 'Harga beli harus berupa angka ≥ 0' }
    items.push({ product_id: id, qty, harga_beli: harga })
  }
  return { items }
}
