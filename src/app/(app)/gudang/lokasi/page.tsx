import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Banner, Card, Field, PageHeader, Table, btnCls, btnGhostCls, inputCls } from '@/components/ui'
import { hapusLokasi, simpanLokasi } from './actions'

type SP = { edit?: string; error?: string; ok?: string }

export default async function LokasiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { edit, error, ok } = await searchParams
  const supabase = await createClient()
  const { data: daftar } = await supabase.from('storage_locations').select('*').order('nama')
  const l = daftar?.find((x) => x.id === edit)
  return (
    <div className="space-y-4">
      <PageHeader title="Lokasi Simpan" subtitle="Freezer, chiller, dan rak beserta rentang suhunya (°C)" />
      <Banner error={error} ok={ok} />
      <Card>
        <form action={simpanLokasi} key={l?.id ?? 'baru'} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" defaultValue={l?.id ?? ''} />
          <Field label="Nama *"><input name="nama" required defaultValue={l?.nama} className={inputCls} /></Field>
          <Field label="Tipe *">
            <select name="tipe" defaultValue={l?.tipe ?? 'freezer'} className={inputCls}>
              <option value="freezer">Freezer</option><option value="chiller">Chiller</option><option value="kering">Kering</option>
            </select>
          </Field>
          <Field label="Suhu min (°C)"><input name="suhu_min" type="number" step="0.1" defaultValue={l?.suhu_min ?? ''} className={inputCls} /></Field>
          <Field label="Suhu maks (°C)"><input name="suhu_maks" type="number" step="0.1" defaultValue={l?.suhu_maks ?? ''} className={inputCls} /></Field>
          <div className="flex gap-2 sm:col-span-4">
            <button className={btnCls}>{l ? 'Simpan perubahan' : 'Tambah lokasi'}</button>
            {l && <Link href="/gudang/lokasi" className={btnGhostCls + ' self-center'}>Batal</Link>}
          </div>
        </form>
      </Card>
      <Table head={['Nama', 'Tipe', 'Rentang suhu', '']}>
        {(daftar ?? []).map((x) => (
          <tr key={x.id}>
            <td className="px-3 py-2 font-medium">{x.nama}</td>
            <td className="px-3 py-2 capitalize">{x.tipe}</td>
            <td className="px-3 py-2">{x.suhu_min ?? '–'} s/d {x.suhu_maks ?? '–'} °C</td>
            <td className="flex gap-2 px-3 py-2">
              <Link href={`/gudang/lokasi?edit=${x.id}`} className={btnGhostCls}>Ubah</Link>
              <form action={hapusLokasi}><input type="hidden" name="id" value={x.id} /><button className={btnGhostCls}>Hapus</button></form>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
