import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { canAccess, type Peran } from '@/lib/roles'

function redirectTo(request: NextRequest, path: string, from: NextResponse) {
  const res = NextResponse.redirect(new URL(path, request.url))
  from.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)
  const path = request.nextUrl.pathname

  if (!user) {
    return path === '/login' ? response : redirectTo(request, '/login', response)
  }
  if (path === '/login') return redirectTo(request, '/', response)

  const { data: profil } = await supabase.from('profiles').select('peran').eq('id', user.id).maybeSingle()
  if (!profil) {
    return path === '/akun-belum-aktif' ? response : redirectTo(request, '/akun-belum-aktif', response)
  }
  if (path === '/akun-belum-aktif') return redirectTo(request, '/', response)
  if (!canAccess(profil.peran as Peran, path)) return redirectTo(request, '/', response)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
