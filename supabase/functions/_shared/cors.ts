/**
 * Helper compartido: cabeceras CORS para las Edge Functions.
 * Importar en cada función:
 *   import { corsHeaders, handleCors } from '../_shared/cors.ts'
 */

// En producción, reemplazar '*' con el dominio real del frontend
// (se configura como variable de entorno CORS_ORIGIN)
const allowedOrigin = Deno.env.get('CORS_ORIGIN') ?? '*'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin':  allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Maneja la solicitud OPTIONS preflight.
 * Retorna `null` si no es OPTIONS (continuar con la lógica normal).
 * Retorna un `Response` de 204 si es OPTIONS.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  return null
}
