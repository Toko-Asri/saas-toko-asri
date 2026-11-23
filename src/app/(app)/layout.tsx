import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { getSessionProfile } from '@/lib/auth'
import { NAMA_PERAN, kelompokMenu } from '@/lib/nav'
import { menuFor } from '@/lib/roles'
import { logout } from '../login/actions'

// Kerangka aplikasi: menu tetap ditentukan roles.ts (hak akses tidak berubah); komponen klien hanya menampilkannya.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profil = await getSessionProfile()
  if (!profil) redirect('/login')
  return (
    <AppShell nama={profil.nama} peran={NAMA_PERAN[profil.peran]} kelompok={kelompokMenu(menuFor(profil.peran))} keluar={logout}>
      {children}
    </AppShell>
  )
}
