import { createClient } from "npm:@supabase/supabase-js@2"

/**
 * Crea un cliente Supabase con service_role.
 * - Omite RLS completamente (bypasses all Row Level Security).
 * - NUNCA exponer esta clave al frontend o a código cliente.
 * - Usar ÚNICAMENTE dentro de Edge Functions.
 */
export function crearClienteServicio() {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!url || !key) {
    throw new Error(
      "Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
        "En local: agrega supabase/functions/.env. " +
        "En producción: usa `supabase secrets set`."
    )
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
