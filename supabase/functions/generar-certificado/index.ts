/**
 * generar-certificado/index.ts
 * Edge Function principal para la generación y descarga de certificados PDF.
 *
 * Recibe: POST { institucion_id, tipo_documento, numero_documento, captcha_token }
 * Retorna: application/pdf  o  JSON con { error }
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts"
import { crearClienteServicio } from "../_shared/supabase-client.ts"
import { normalizarNumero, esTipoValido } from "../_shared/normalize.ts"
import { generarCertificadoPDF } from "./pdf-builder.ts"

// ── Handler principal ────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. CORS preflight
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  if (req.method !== "POST") {
    return jsonError(405, "Método no permitido")
  }

  try {
    // 2. Parsear y validar el body
    let body: Record<string, string>
    try {
      body = await req.json()
    } catch {
      return jsonError(400, "El cuerpo de la solicitud debe ser JSON válido")
    }

    const { institucion_id, tipo_documento, numero_documento, captcha_token } = body

    if (!institucion_id || !tipo_documento || !numero_documento || !captcha_token) {
      return jsonError(400, "Todos los campos son requeridos")
    }

    // 3. Validar tipo de documento
    if (!esTipoValido(tipo_documento)) {
      // Mensaje genérico para no revelar información sobre la BD
      return jsonError(404, MSG_NO_ENCONTRADO)
    }

    // 4. Validar captcha Turnstile
    const ip = obtenerIP(req)
    const captchaOk = await validarTurnstile(captcha_token, ip)
    if (!captchaOk) {
      return jsonError(400, "Verificación de seguridad fallida. Recarga la página e intenta de nuevo.")
    }

    // 5. Normalizar número de documento
    const numeroNorm = normalizarNumero(numero_documento)
    if (!numeroNorm) {
      return jsonError(404, MSG_NO_ENCONTRADO)
    }

    const supabase = crearClienteServicio()

    // 6. Rate limiting por hash de IP (Fase 5)
    const ipHash = await hashearIP(ip)
    const limitado = await excedioLimite(supabase, ipHash)
    if (limitado) {
      return jsonError(429, "Demasiados intentos. Espera unos minutos e intenta de nuevo.")
    }

    // 7. Buscar estudiante en esa institución específica
    const { data: estudiante, error: errEst } = await supabase
      .from("estudiantes")
      .select("id, nombre_completo, tipo_documento, numero_documento")
      .eq("institucion_id", institucion_id)
      .eq("tipo_documento", tipo_documento)
      .eq("numero_documento", numeroNorm)
      .maybeSingle()

    if (errEst) {
      console.error("Error al buscar estudiante:", errEst)
      // No revelar detalles internos al cliente
      await registrarIntento(supabase, ipHash, false)
      return jsonError(500, "Ocurrió un error. Intenta nuevamente más tarde.")
    }

    if (!estudiante) {
      await registrarIntento(supabase, ipHash, false)
      return jsonError(404, MSG_NO_ENCONTRADO)
    }

    // 8. Obtener institución (con su contratista) y los 2 firmantes fijos
    const { data: institucion, error: errInst } = await supabase
      .from("instituciones")
      .select(`
        id, nombre, municipio, fecha_expedicion,
        contratista:firmantes!contratista_id ( id, nombre, cargo, firma_path )
      `)
      .eq("id", institucion_id)
      .eq("activa", true)
      .single()

    if (errInst || !institucion) {
      await registrarIntento(supabase, ipHash, false)
      return jsonError(404, MSG_NO_ENCONTRADO)
    }

    // Firmantes fijos (puestos 1 y 2): iguales en todos los certificados
    const { data: fijos, error: errFijos } = await supabase
      .from("firmantes")
      .select("id, nombre, cargo, firma_path")
      .eq("es_fijo", true)
      .order("orden_fijo")

    if (errFijos) {
      console.error("Error al obtener firmantes fijos:", errFijos)
      await registrarIntento(supabase, ipHash, false)
      return jsonError(500, "Ocurrió un error. Intenta nuevamente más tarde.")
    }

    // Orden de firma: fijo 1, fijo 2, contratista de la institución (derecha)
    const firmantes = [...(fijos ?? []), institucion.contratista as any].filter(Boolean)

    // 9. Descargar imágenes de firma desde Storage (privado)
    const firmasImagenes = await descargarFirmas(supabase, firmantes)

    // 10. Generar PDF
    const pdfBytes = await generarCertificadoPDF({
      estudiante: {
        nombre_completo: estudiante.nombre_completo,
        numero_documento: estudiante.numero_documento,
      },
      institucion: {
        nombre:           institucion.nombre,
        municipio:        institucion.municipio,
        fecha_expedicion: institucion.fecha_expedicion,
      },
      firmantes,
      firmasImagenes,
    })

    // 11. Registrar intento exitoso
    await registrarIntento(supabase, ipHash, true)

    // 12. Entregar PDF
    const nombreArchivo = `Certificado_${numeroNorm}.pdf`
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    })
  } catch (err) {
    console.error("Error inesperado en generar-certificado:", err)
    return jsonError(500, "Ocurrió un error inesperado. Intenta nuevamente más tarde.")
  }
})

// ── Constantes ───────────────────────────────────────────────────────────

/** Mensaje genérico — no revela si el documento existe en otra institución */
const MSG_NO_ENCONTRADO =
  "No encontramos un certificado con esos datos. " +
  "Verifica la institución, el tipo y el número de documento."

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_MINUTOS = 15

// ── Helpers ──────────────────────────────────────────────────────────────

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function obtenerIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

async function excedioLimite(
  supabase: ReturnType<typeof crearClienteServicio>,
  ipHash: string
): Promise<boolean> {
  const desde = new Date(Date.now() - RATE_LIMIT_MINUTOS * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from("intentos_descarga")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("creado_en", desde)

  if (error) {
    console.error("Error consultando rate limit:", error)
    return false
  }
  return (count ?? 0) >= RATE_LIMIT_MAX
}

async function hashearIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip)
  const buf  = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Valida el token de Cloudflare Turnstile.
 * Si TURNSTILE_SECRET_KEY no está definida (dev local), omite la validación.
 */
async function validarTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY")

  if (!secretKey) {
    console.warn("⚠️  TURNSTILE_SECRET_KEY no definida — saltando validación de captcha (solo dev)")
    return true
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretKey, response: token, remoteip: ip }),
      }
    )
    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error("Error validando Turnstile:", err)
    return false
  }
}

/**
 * Descarga las imágenes PNG de firma desde el bucket privado 'firmas'.
 * Si una imagen no existe o falla, retorna null para esa posición
 * (el PDF mostrará una línea de firma en su lugar).
 */
async function descargarFirmas(
  supabase: ReturnType<typeof crearClienteServicio>,
  firmantes: Array<{ firma_path: string }>
): Promise<(Uint8Array | null)[]> {
  return Promise.all(
    firmantes.map(async (f) => {
      try {
        // firma_path puede ser "firmas/archivo.png" o simplemente "archivo.png"
        const relPath = f.firma_path.startsWith("firmas/")
          ? f.firma_path.slice("firmas/".length)
          : f.firma_path

        const { data, error } = await supabase.storage
          .from("firmas")
          .download(relPath)

        if (error || !data) return null

        const buffer = await data.arrayBuffer()
        return new Uint8Array(buffer)
      } catch {
        return null
      }
    })
  )
}

/**
 * Inserta un registro de auditoría en intentos_descarga.
 * Los errores aquí son no críticos — se loguean pero no abortan la respuesta.
 */
async function registrarIntento(
  supabase: ReturnType<typeof crearClienteServicio>,
  ipHash: string,
  exitoso: boolean
): Promise<void> {
  try {
    await supabase.from("intentos_descarga").insert({ ip_hash: ipHash, exitoso })
  } catch (err) {
    console.error("Error registrando intento:", err)
  }
}
