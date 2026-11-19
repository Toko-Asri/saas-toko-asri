import { createClient } from '@/lib/supabase/server'
import type { Peran } from '@/lib/roles'

export type SessionProfile = { userId: string; nama: string; peran: Peran } | null

export async function getSessionProfile(): Promise<SessionProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('nama, peran').eq('id', user.id).maybeSingle()
  if (!data) return null
  return { userId: user.id, nama: data.nama, peran: data.peran as Peran }
}

// Dipakai di Server Action: RLS tetap menjadi pagar utama, ini memberi pesan galat yang jelas.
export async function assertGudang(): Promise<void> {
  const p = await getSessionProfile()
  if (!p || (p.peran !== 'pemilik' && p.peran !== 'staf_gudang')) throw new Error('Tidak diizinkan')
}

// Server Action pelanggan/kasir: RLS tetap pagar utama, ini memberi pesan galat yang jelas.
export async function assertKasirAtauPemilik(): Promise<void> {
  const p = await getSessionProfile()
  if (!p || (p.peran !== 'pemilik' && p.peran !== 'kasir')) throw new Error('Tidak diizinkan')
}
