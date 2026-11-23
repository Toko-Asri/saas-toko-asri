import {
  Boxes, ChartColumn, ChartPie, ClipboardCheck, Factory, LayoutDashboard, Lightbulb, Package, Receipt, ShoppingCart, Snowflake, Tag, Truck, Users,
  type LucideIcon,
} from 'lucide-react'

// Kunci ikon dari src/lib/nav.ts -> komponen ikon lucide.
const IKON: Record<string, LucideIcon> = {
  beranda: LayoutDashboard, kasir: ShoppingCart, riwayat: Receipt, pelanggan: Users, segmen: ChartPie,
  inventori: Boxes, saran: Lightbulb, pembelian: Truck, penyesuaian: ClipboardCheck, produk: Tag,
  pemasok: Factory, lokasi: Snowflake, laporan: ChartColumn, default: Package,
}

export function IkonMenu({ nama, className = 'size-5' }: { nama: string; className?: string }) {
  const Komponen = IKON[nama] ?? IKON.default
  return <Komponen aria-hidden className={className} strokeWidth={1.9} />
}
