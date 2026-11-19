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
