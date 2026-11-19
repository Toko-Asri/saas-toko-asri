export type BarisKeranjang = { productId: string; nama: string; harga: number; qty: number; stokLayak: number }

export function tambah(k: BarisKeranjang[], p: Omit<BarisKeranjang, 'qty'>): BarisKeranjang[] {
  if (p.stokLayak <= 0) return k
  const ada = k.find((b) => b.productId === p.productId)
  if (!ada) return [...k, { ...p, qty: 1 }]
  return k.map((b) => (b.productId === p.productId ? { ...b, qty: Math.min(b.qty + 1, b.stokLayak) } : b))
}

// qty <= 0 atau bukan angka menghapus baris; pecahan dibulatkan ke bawah; dibatasi stok layak jual.
export function ubahQty(k: BarisKeranjang[], productId: string, qty: number): BarisKeranjang[] {
  const bulat = Math.floor(qty)
  if (!Number.isFinite(bulat) || bulat <= 0) return k.filter((b) => b.productId !== productId)
  return k.map((b) => (b.productId === productId ? { ...b, qty: Math.min(bulat, b.stokLayak) } : b))
}

export function total(k: BarisKeranjang[]): number {
  return k.reduce((a, b) => a + b.harga * b.qty, 0)
}

export function kembalian(totalBayar: number, bayar: number): number | null {
  return bayar < totalBayar ? null : bayar - totalBayar
}

export function keItemCheckout(k: BarisKeranjang[]): { product_id: string; qty: number }[] {
  return k.map((b) => ({ product_id: b.productId, qty: b.qty }))
}
