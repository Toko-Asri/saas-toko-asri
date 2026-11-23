import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Badge, BarisKosong, PageHeader, Table, btnCls } from '@/components/ui'
import { STATUS_PO } from '@/lib/po-status'

export default async function PembelianPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('purchase_orders')
    .select('id, status, created_at, suppliers(nama), purchase_order_items(qty_pesan, harga_beli)')
    .order('created_at', { ascending: false })
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <PageHeader title="Pesanan Pembelian" subtitle="Pesanan ke pemasok dan penerimaan barang" />
        <Link href="/gudang/pembelian/baru" className={btnCls}>PO baru</Link>
      </div>
      <Table head={['Tanggal', 'Pemasok', 'Jumlah item', 'Total', 'Status', '']}>
        {(data ?? []).length === 0 && <BarisKosong colSpan={6}>Belum ada pesanan pembelian.</BarisKosong>}
        {(data ?? []).map((po) => {
          const items = po.purchase_order_items as { qty_pesan: number; harga_beli: number }[]
          const total = items.reduce((a, i) => a + i.qty_pesan * Number(i.harga_beli), 0)
          const st = STATUS_PO[po.status]
          return (
            <tr key={po.id}>
              <td className="px-3 py-2">{formatTanggal(po.created_at)}</td>
              <td className="px-3 py-2 font-medium">{(po.suppliers as unknown as { nama: string })?.nama}</td>
              <td className="px-3 py-2">{items.length}</td>
              <td className="px-3 py-2">{formatRupiah(total)}</td>
              <td className="px-3 py-2"><Badge nada={st.nada}>{st.teks}</Badge></td>
              <td className="px-3 py-2"><Link href={`/gudang/pembelian/${po.id}`} className="text-brand-700 hover:underline">Buka</Link></td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
