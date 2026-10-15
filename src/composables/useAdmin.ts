import { supabase } from '@/lib/supabase'

export function esUsuarioAdmin(appMetadata: Record<string, unknown> | undefined): boolean {
  return appMetadata?.rol === 'admin'
}

export async function exigirSesionAdmin() {
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return { session: null, ok: false as const }
  if (!esUsuarioAdmin(session.user.app_metadata as Record<string, unknown>)) {
    await supabase.auth.signOut()
    return { session: null, ok: false as const }
  }
  return { session, ok: true as const }
}
