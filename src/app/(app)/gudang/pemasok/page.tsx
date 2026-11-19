import { createClient } from '@/lib/supabase/server'
import { Banner, Card, Field, PageHeader, Table, btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { simpanPemasok, ubahAktifPemasok } from './actions'
import Link from 'next/link'

type SP = { edit?: string; error?: string; ok?: string }

export default async function PemasokPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { edit, error, ok } = await searchParams
  const supabase = await createClient()
  const { data: daftar } = await supabase.from('suppliers').select('*').order('nama')
  const sedangDiubah = daftar?.find((s) => s.id === edit)
  return (
    <div className="space-y-4">
      <PageHeader title="Pemasok" subtitle="Daftar pemasok barang frozen food" />
      <Banner error={error} ok={ok} />
      <Card>
        <form action={simpanPemasok} key={sedangDiubah?.id ?? 'baru'} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" defaultValue={sedangDiubah?.id ?? ''} />
          <Field label="Nama pemasok *"><input name="nama" required defaultValue={sedangDiubah?.nama} className={inputCls} /></Field>
          <Field label="Nama kontak"><input name="kontak" defaultValue={sedangDiubah?.kontak ?? ''} className={inputCls} /></Field>
          <Field label="Telepon"><input name="telepon" defaultValue={sedangDiubah?.telepon ?? ''} className={inputCls} /></Field>
          <Field label="Alamat"><input name="alamat" defaultValue={sedangDiubah?.alamat ?? ''} className={inputCls} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <button className={btnCls}>{sedangDiubah ? 'Simpan perubahan' : 'Tambah pemasok'}</button>
            {sedangDiubah && <Link href="/gudang/pemasok" className={btnGhostCls + ' self-center'}>Batal</Link>}
          </div>
        </form>
      </Card>
      <Table head={['Nama', 'Kontak', 'Telepon', 'Status', '']}>
        {(daftar ?? []).map((s) => (
          <tr key={s.id} className={s.aktif ? '' : 'text-slate-400'}>
            <td className="px-3 py-2 font-medium">{s.nama}</td>
            <td className="px-3 py-2">{s.kontak}</td>
            <td className="px-3 py-2">{s.telepon}</td>
            <td className="px-3 py-2">{s.aktif ? 'Aktif' : 'Nonaktif'}</td>
            <td className="flex gap-2 px-3 py-2">
              <Link href={`/gudang/pemasok?edit=${s.id}`} className={btnGhostCls}>Ubah</Link>
              <form action={ubahAktifPemasok}>
                <input type="hidden" name="id" value={s.id} /><input type="hidden" name="aktif" value={String(!s.aktif)} />
                <button className={btnGhostCls}>{s.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
