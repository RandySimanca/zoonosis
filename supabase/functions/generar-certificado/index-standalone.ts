/**
 * generar-certificado/index-standalone.ts
 * Edge Function consolidada en un solo archivo para facilitar el deploy desde el dashboard.
 *
 * Recibe: POST { institucion_id, tipo_documento, numero_documento, captcha_token }
 * Retorna: application/pdf  o  JSON con { error }
 */

import { createClient } from "npm:@supabase/supabase-js@2"
import { generarCertificadoPDF } from "./pdf-builder.ts"

// ── CORS ─────────────────────────────────────────────────────────────

const allowedOrigin = Deno.env.get('CORS_ORIGIN') ?? '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin':  allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  return null
}

// ── Supabase Client ───────────────────────────────────────────────────

function crearClienteServicio() {
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

// ── Normalización ─────────────────────────────────────────────────────

const TIPOS_DOCUMENTO = ["RC", "TI", "CC", "CE", "PPT", "PEP"] as const
type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

function normalizarNumero(raw: string): string {
  return raw
    .replace(/[\s.\-,]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

const MAPA_TIPOS: Record<string, TipoDocumento> = {
  RC: "RC",
  "REGISTRO CIVIL": "RC",
  "REGISTROCIVIL": "RC",
  TI: "TI",
  "TARJETA DE IDENTIDAD": "TI",
  "TARJETA IDENTIDAD": "TI",
  "TARJETADEIDENTIDAD": "TI",
  "T.I.": "TI",
  CC: "CC",
  CEDULA: "CC",
  CÉDULA: "CC",
  "C.C.": "CC",
  "CEDULA DE CIUDADANIA": "CC",
  "CÉDULA DE CIUDADANÍA": "CC",
  "CEDULA CIUDADANIA": "CC",
  CE: "CE",
  "CEDULA DE EXTRANJERIA": "CE",
  "CÉDULA DE EXTRANJERÍA": "CE",
  "CEDULA EXTRANJERIA": "CE",
  "C.E.": "CE",
  PPT: "PPT",
  "PERMISO DE PROTECCION TEMPORAL": "PPT",
  "PERMISO PROTECCION TEMPORAL": "PPT",
  "PERMISO DE PROTECCIÓN TEMPORAL": "PPT",
  PEP: "PEP",
  "PERMISO ESPECIAL DE PERMANENCIA": "PEP",
  "PERMISO ESPECIAL PERMANENCIA": "PEP",
}

function esTipoValido(tipo: string): tipo is TipoDocumento {
  return TIPOS_DOCUMENTO.includes(tipo as TipoDocumento)
}

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

    console.log("📥 Body recibido:", body)

    const { institucion_id, tipo_documento, numero_documento, captcha_token } = body

    if (!tipo_documento || !numero_documento || !captcha_token) {
      return jsonError(400, "Todos los campos son requeridos")
    }

    // 3. Validar tipo de documento
    if (!esTipoValido(tipo_documento)) {
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

    console.log("🔍 Buscando estudiante:", {
      institucion_id,
      tipo_documento,
      numero_documento_original: numero_documento,
      numero_documento_normalizado: numeroNorm,
    })

    const supabase = crearClienteServicio()

    // 6. Rate limiting por hash de IP (Fase 5)
    const ipHash = await hashearIP(ip)
    const limitado = await excedioLimite(supabase, ipHash)
    if (limitado) {
      return jsonError(429, "Demasiados intentos. Espera unos minutos e intenta de nuevo.")
    }

    // 7. Buscar estudiante por tipo + número (único global) con su jornada
    const { data: estudiante, error: errEst } = await supabase
      .from("estudiantes")
      .select(`
        id, nombre_completo, tipo_documento, numero_documento, aprobado,
        jornada:jornadas!jornada_id (
          id, activa, fecha_expedicion, institucion_id,
          institucion:instituciones!institucion_id ( id, nombre, municipio, activa ),
          contratista:firmantes!contratista_id ( id, nombre, cargo, firma_path )
        )
      `)
      .eq("tipo_documento", tipo_documento)
      .eq("numero_documento", numeroNorm)
      .maybeSingle()

    console.log("📊 Resultado búsqueda:", { estudiante, error: errEst })

    if (errEst) {
      console.error("Error al buscar estudiante:", errEst)
      await registrarIntento(supabase, ipHash, false)
      return jsonError(500, "Ocurrió un error. Intenta nuevamente más tarde.")
    }

    const jornada = (estudiante as any)?.jornada
    const institucion = jornada?.institucion
    const contratista = jornada?.contratista

    // institucion_id es opcional: si llega, debe coincidir con la jornada del estudiante
    const coincideInst = !institucion_id || jornada?.institucion_id === institucion_id

    if (!estudiante || !estudiante.aprobado || !jornada?.activa || !institucion?.activa || !coincideInst) {
      console.warn("⚠️ Sin certificado:", {
        encontrado: !!estudiante, aprobado: estudiante?.aprobado,
        jornadaActiva: jornada?.activa, institucionActiva: institucion?.activa, coincideInst,
      })
      await registrarIntento(supabase, ipHash, false)
      return jsonError(404, MSG_NO_ENCONTRADO)
    }

    // 8. Firmantes fijos (puestos 1 y 2): iguales en todos los certificados
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

    // Orden de firma: fijo 1, fijo 2, contratista de la jornada (derecha)
    const firmantes = [...(fijos ?? []), contratista as any].filter(Boolean)

    // 9. Descargar imágenes de firma desde Storage (privado)
    const firmasImagenes = await descargarFirmas(supabase, firmantes)

    // 10. Generar PDF
    const pdfBytes = await generarCertificadoPDF({
      estudiante: {
        nombre_completo: estudiante.nombre_completo,
        tipo_documento: estudiante.tipo_documento,
        numero_documento: estudiante.numero_documento,
      },
      institucion: {
        nombre:           institucion.nombre,
        municipio:        institucion.municipio,
        fecha_expedicion: jornada.fecha_expedicion,
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

async function validarTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY")

  if (!secretKey) {
    console.warn("⚠️  TURNSTILE_SECRET_KEY no definida — saltando validación de captcha (solo dev)")
    return true
  }

  // Token de bypass para pruebas sin CAPTCHA
  if (token === "dev-bypass") {
    console.warn("⚠️  Usando dev-bypass — saltando validación de captcha")
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

async function descargarFirmas(
  supabase: ReturnType<typeof crearClienteServicio>,
  firmantes: Array<{ firma_path: string }>
): Promise<(Uint8Array | null)[]> {
  return Promise.all(
    firmantes.map(async (f) => {
      try {
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
