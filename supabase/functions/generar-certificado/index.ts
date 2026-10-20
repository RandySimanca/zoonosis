/**
 * generar-certificado — ARCHIVO ÚNICO para pegar en el dashboard de Supabase.
 * Incluye layout + generador de PDF + función principal. No depende de otros archivos.
 *
 * Recibe: POST { tipo_documento, numero_documento, captcha_token, institucion_id? }
 * Retorna: application/pdf  o  JSON con { error }
 */

import { createClient } from "npm:@supabase/supabase-js@2"
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
  Color,
} from "npm:pdf-lib@1.17.1"
import fontkit from "npm:@pdf-lib/fontkit@1.1.1"

// ════════ LAYOUT ════════
/**
 * layout.ts — Configuración de posición y tamaño de cada elemento del certificado.
 *
 * Coordenadas en puntos PDF (origen = esquina INFERIOR-IZQUIERDA).
 * Para convertir "N pts desde arriba": y = PAGE_HEIGHT - N
 *
 * Ajusta estos valores cuando llegue la plantilla gráfica definitiva.
 * La función generarCertificadoPDF() en pdf-builder.ts usa únicamente
 * estas constantes — nunca valores numéricos literales.
 */

// ── Dimensiones A4 horizontal ────────────────────────────────────────────
const PAGE_WIDTH = 841.89   // 297 mm en puntos
const PAGE_HEIGHT = 595.28  // 210 mm en puntos

// Margen horizontal del área de texto (izquierda y derecha)
const MARGIN_H = 48
const TEXT_WIDTH = PAGE_WIDTH - MARGIN_H * 2  // ~745.89 pts
const CENTER_X = PAGE_WIDTH / 2               // ~420.945 pts

// ── Colores (valores RGB 0–1) ────────────────────────────────────────────
const COLORES = {
  azul: { r: 0.10, g: 0.23, b: 0.42 },  // #1a3a6b — primario institucional
  teal: { r: 0.10, g: 0.48, b: 0.43 },  // #1a7a6e — verde petróleo
  dorado: { r: 0.75, g: 0.60, b: 0.15 },  // acento dorado
  blanco: { r: 1.00, g: 1.00, b: 1.00 },
  negro: { r: 0.12, g: 0.12, b: 0.12 },
  gris: { r: 0.40, g: 0.40, b: 0.40 },
  fondo: { r: 0.98, g: 0.98, b: 0.98 },
  azulPale: { r: 0.80, g: 0.88, b: 1.00 }, // texto secundario sobre fondo azul
}

// ── URLs de fuentes con soporte de tildes y ñ ────────────────────────────
// Noto Sans (Google/jsDelivr CDN). Si fallan, se usa Helvetica de fallback.
const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.1.1/files/noto-sans-latin-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.1.1/files/noto-sans-latin-700-normal.woff",
}

// ── Elementos del certificado ────────────────────────────────────────────
const LAYOUT = {

  // ── Fondo y decoración ────────────────────────────────────────
  decoracion: {
    // Banda azul en el encabezado
    bandaAltura: 88,
    get bandaY() { return PAGE_HEIGHT - this.bandaAltura },  // 507.28

    // Línea dorada bajo la banda
    lineaDoradaAltura: 3,
    get lineaDoradaY() { return this.bandaY - this.lineaDoradaAltura },  // 504.28

    // Marco exterior del certificado
    marcoMargen: 10,
    marcoGrosor: 1.5,
  },

  // ── Encabezado (texto sobre la banda azul) ────────────────────
  encabezado: {
    gobernacion: {
      y: PAGE_HEIGHT - 33,   // 562.28
      fontSize: 15,
      fontSizeMin: 10,
    },
    secretaria: {
      y: PAGE_HEIGHT - 54,   // 541.28
      fontSize: 11,
      fontSizeMin: 8,
    },
    programa: {
      y: PAGE_HEIGHT - 72,   // 523.28
      fontSize: 9,
      fontSizeMin: 7,
    },
  },

  // ── Título ────────────────────────────────────────────────────
  titulo: {
    y: 478,
    fontSize: 20,
  },

  // ── Cuerpo del certificado ────────────────────────────────────
  cuerpo: {
    intro1: { y: 448, fontSize: 10 },
    intro2: { y: 433, fontSize: 10 },

    certificaLabel: { y: 408, fontSize: 13 },

    nombreEstudiante: {
      y: 370,
      fontSizeMax: 26,
      fontSizeMin: 12,
    },

    // Tipo y número de documento, justo debajo del nombre
    documentoEstudiante: { y: 350, fontSize: 11, fontSizeMin: 8 },

    deInstitucion: { y: 332, fontSize: 10, fontSizeMin: 8 },
    participo: { y: 318, fontSize: 10 },
    estrategia: { y: 300, fontSize: 11 },
    fortale1: { y: 283, fontSize: 10 },
    fortale2: { y: 268, fontSize: 10 },
    expedicion: { y: 236, fontSize: 10, fontSizeMin: 8 },
  },

  // ── Área de firmas ────────────────────────────────────────────
  firmas: {
    separadorY: 208,         // línea horizontal separadora

    // Imagen de la firma: imagenY es el extremo INFERIOR de la imagen
    imagenY: 158,
    imagenW: 95,
    imagenH: 48,

    lineaFirmaY: 152,        // línea bajo la imagen (si no hay imagen)
    lineaFirmaW: 130,

    nombreY: 140,         // nombre del firmante en mayúsculas
    cargoY: 127,         // cargo (primera parte, sin "Programa...")
    etvY: 114,         // "Programa ETV y Zoonosis"

    fontSizeNombre: 8,
    fontSizeCargo: 7,

    // Centro x de cada columna de firma (tres columnas equidistantes)
    cols: [
      PAGE_WIDTH * 0.20,   // ≈ 168.4  (izquierda)
      PAGE_WIDTH * 0.50,   // ≈ 420.9  (centro)
      PAGE_WIDTH * 0.80,   // ≈ 673.5  (derecha)
    ],
  },
}

// ════════ GENERADOR PDF ════════

// ── Tipos ────────────────────────────────────────────────────────────────

interface FirmanteData {
  nombre: string
  cargo: string
  firma_path: string
}

interface CertificadoOpts {
  estudiante: {
    nombre_completo: string
    tipo_documento: string
    numero_documento: string
  }
  institucion: {
    nombre: string
    municipio: string
    fecha_expedicion: string  // "YYYY-MM-DD"
  }
  firmantes: FirmanteData[]
  firmasImagenes: (Uint8Array | null)[]  // PNG/JPG bytes por firmante, null = placeholder
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
}

// ── Colores pre-instanciados ─────────────────────────────────────────────
const C = {
  azul: rgb(COLORES.azul.r, COLORES.azul.g, COLORES.azul.b),
  teal: rgb(COLORES.teal.r, COLORES.teal.g, COLORES.teal.b),
  dorado: rgb(COLORES.dorado.r, COLORES.dorado.g, COLORES.dorado.b),
  blanco: rgb(COLORES.blanco.r, COLORES.blanco.g, COLORES.blanco.b),
  negro: rgb(COLORES.negro.r, COLORES.negro.g, COLORES.negro.b),
  gris: rgb(COLORES.gris.r, COLORES.gris.g, COLORES.gris.b),
  fondo: rgb(COLORES.fondo.r, COLORES.fondo.g, COLORES.fondo.b),
  azulPale: rgb(COLORES.azulPale.r, COLORES.azulPale.g, COLORES.azulPale.b),
}

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

// ── Punto de entrada ─────────────────────────────────────────────────────

/**
 * Genera el PDF del certificado y retorna sus bytes.
 * Lanza un error si la generación falla.
 */
async function generarCertificadoPDF(opts: CertificadoOpts): Promise<Uint8Array> {
  const { estudiante, institucion, firmantes, firmasImagenes } = opts

  // Parsear fecha de expedición (forzar mediodía UTC para evitar desfase)
  const fechaObj = new Date(`${institucion.fecha_expedicion}T12:00:00Z`)
  const dia = fechaObj.getUTCDate()
  const mes = MESES_ES[fechaObj.getUTCMonth()]
  const anio = fechaObj.getUTCFullYear()

  // ── Crear documento ──────────────────────────────────────────
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const fonts = await cargarFuentes(doc)

  // Página A4 horizontal
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  // ── Dibujar en orden (de atrás hacia adelante) ───────────────
  dibujarFondo(page)
  dibujarEncabezado(page, fonts)
  dibujarTitulo(page, fonts)
  dibujarCuerpo(page, fonts, {
    nombreEstudiante: estudiante.nombre_completo,
    tipoDocumento: estudiante.tipo_documento,
    numeroDocumento: estudiante.numero_documento,
    nombreInstitucion: institucion.nombre,
    municipio: institucion.municipio,
    dia, mes, anio: String(anio),
  })
  await dibujarFirmas(page, doc, fonts, firmantes, firmasImagenes)

  return await doc.save()
}

// ── Fuentes ──────────────────────────────────────────────────────────────

async function cargarFuentes(doc: PDFDocument): Promise<Fonts> {
  try {
    const [bytesReg, bytesBold] = await Promise.all([
      fetch(FONT_URLS.regular).then((r) => {
        if (!r.ok) throw new Error(`CDN ${r.status}`)
        return r.arrayBuffer()
      }),
      fetch(FONT_URLS.bold).then((r) => {
        if (!r.ok) throw new Error(`CDN ${r.status}`)
        return r.arrayBuffer()
      }),
    ])
    return {
      regular: await doc.embedFont(bytesReg, { subset: true }),
      bold: await doc.embedFont(bytesBold, { subset: true }),
    }
  } catch (err) {
    // Fallback: Helvetica soporta WinAnsiEncoding (incluye tildes y ñ)
    console.warn("Fuente personalizada no disponible, usando Helvetica:", err)
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    }
  }
}

// ── Fondo y decoración ───────────────────────────────────────────────────

function dibujarFondo(page: PDFPage): void {
  const { decoracion } = LAYOUT

  // Fondo general
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT,
    color: C.fondo,
  })

  // Banda azul superior
  page.drawRectangle({
    x: 0, y: decoracion.bandaY,
    width: PAGE_WIDTH, height: decoracion.bandaAltura,
    color: C.azul,
  })

  // Línea dorada debajo de la banda
  page.drawRectangle({
    x: 0, y: decoracion.lineaDoradaY,
    width: PAGE_WIDTH, height: decoracion.lineaDoradaAltura,
    color: C.dorado,
  })

  // Banda decorativa inferior (más delgada)
  page.drawRectangle({
    x: 0, y: 0,
    width: PAGE_WIDTH, height: 22,
    color: C.azul,
  })

  // Marco exterior: 4 líneas
  const m = decoracion.marcoMargen
  const g = decoracion.marcoGrosor
  const marcoColor = C.azul

  // top
  page.drawLine({ start: { x: m, y: PAGE_HEIGHT - m }, end: { x: PAGE_WIDTH - m, y: PAGE_HEIGHT - m }, thickness: g, color: marcoColor })
  // bottom
  page.drawLine({ start: { x: m, y: m }, end: { x: PAGE_WIDTH - m, y: m }, thickness: g, color: marcoColor })
  // left
  page.drawLine({ start: { x: m, y: m }, end: { x: m, y: PAGE_HEIGHT - m }, thickness: g, color: marcoColor })
  // right
  page.drawLine({ start: { x: PAGE_WIDTH - m, y: m }, end: { x: PAGE_WIDTH - m, y: PAGE_HEIGHT - m }, thickness: g, color: marcoColor })
}

// ── Encabezado ───────────────────────────────────────────────────────────

function dibujarEncabezado(page: PDFPage, fonts: Fonts): void {
  const { encabezado } = LAYOUT

  textoCentrado(page, "GOBERNACIÓN DE CÓRDOBA", encabezado.gobernacion.y, {
    font: fonts.bold, size: encabezado.gobernacion.fontSize,
    sizeMin: encabezado.gobernacion.fontSizeMin,
    color: C.blanco, maxWidth: TEXT_WIDTH,
  })

  textoCentrado(page, "Secretaría de Salud Departamental", encabezado.secretaria.y, {
    font: fonts.regular, size: encabezado.secretaria.fontSize,
    sizeMin: encabezado.secretaria.fontSizeMin,
    color: C.blanco, maxWidth: TEXT_WIDTH,
  })

  textoCentrado(
    page,
    "Programa de Enfermedades Transmitidas por Vectores (ETV) y Zoonosis",
    encabezado.programa.y,
    {
      font: fonts.regular, size: encabezado.programa.fontSize,
      sizeMin: encabezado.programa.fontSizeMin,
      color: C.azulPale, maxWidth: TEXT_WIDTH,
    }
  )
}

// ── Título ───────────────────────────────────────────────────────────────

function dibujarTitulo(page: PDFPage, fonts: Fonts): void {
  const { titulo } = LAYOUT

  textoCentrado(page, "CERTIFICADO DE PARTICIPACIÓN", titulo.y, {
    font: fonts.bold, size: titulo.fontSize,
    color: C.teal, maxWidth: TEXT_WIDTH,
  })

  // Línea decorativa bajo el título
  const lineaW = TEXT_WIDTH * 0.55
  page.drawLine({
    start: { x: CENTER_X - lineaW / 2, y: titulo.y - 7 },
    end: { x: CENTER_X + lineaW / 2, y: titulo.y - 7 },
    thickness: 0.7, color: C.teal, opacity: 0.4,
  })
}

// ── Cuerpo ───────────────────────────────────────────────────────────────

const NOMBRES_TIPO_DOC: Record<string, string> = {
  RC: "Registro Civil",
  TI: "Tarjeta de Identidad",
  CC: "Cédula de Ciudadanía",
  CE: "Cédula de Extranjería",
  PPT: "Permiso por Protección Temporal",
  PEP: "Permiso Especial de Permanencia",
}

interface CuerpoData {
  nombreEstudiante: string
  tipoDocumento: string
  numeroDocumento: string
  nombreInstitucion: string
  municipio: string
  dia: number
  mes: string
  anio: string
}

function dibujarCuerpo(page: PDFPage, fonts: Fonts, data: CuerpoData): void {
  const { cuerpo } = LAYOUT
  const { nombreEstudiante, tipoDocumento, numeroDocumento, nombreInstitucion, municipio, dia, mes, anio } = data

  // "La Secretaría de Salud..."
  textoCentrado(
    page,
    "La Secretaría de Salud Departamental de Córdoba, a través del Programa de",
    cuerpo.intro1.y,
    { font: fonts.regular, size: cuerpo.intro1.fontSize, color: C.gris, maxWidth: TEXT_WIDTH }
  )
  textoCentrado(
    page,
    "Enfermedades Transmitidas por Vectores (ETV) y Zoonosis,",
    cuerpo.intro2.y,
    { font: fonts.regular, size: cuerpo.intro2.fontSize, color: C.gris, maxWidth: TEXT_WIDTH }
  )

  // CERTIFICA QUE
  textoCentrado(page, "CERTIFICA QUE", cuerpo.certificaLabel.y, {
    font: fonts.bold, size: cuerpo.certificaLabel.fontSize,
    color: C.azul, maxWidth: TEXT_WIDTH,
  })

  // Nombre del estudiante (tamaño auto-ajustado)
  const nombreSize = ajustarTamanio(
    fonts.bold, nombreEstudiante,
    cuerpo.nombreEstudiante.fontSizeMax,
    cuerpo.nombreEstudiante.fontSizeMin,
    TEXT_WIDTH
  )
  textoCentrado(page, nombreEstudiante, cuerpo.nombreEstudiante.y, {
    font: fonts.bold, size: nombreSize, color: C.azul,
  })

  // Subrayado proporcional al nombre
  const nombreAncho = fonts.bold.widthOfTextAtSize(nombreEstudiante, nombreSize)
  const subrayW = Math.min(nombreAncho + 16, TEXT_WIDTH)
  page.drawLine({
    start: { x: CENTER_X - subrayW / 2, y: cuerpo.nombreEstudiante.y - 4 },
    end: { x: CENTER_X + subrayW / 2, y: cuerpo.nombreEstudiante.y - 4 },
    thickness: 0.8, color: C.azul, opacity: 0.3,
  })

  // Tipo y número de documento debajo del nombre
  const tipoNombre = NOMBRES_TIPO_DOC[tipoDocumento] ?? tipoDocumento
  textoCentrado(
    page,
    `${tipoNombre} No. ${numeroDocumento}`,
    cuerpo.documentoEstudiante.y,
    {
      font: fonts.regular, size: cuerpo.documentoEstudiante.fontSize,
      sizeMin: cuerpo.documentoEstudiante.fontSizeMin,
      color: C.negro, maxWidth: TEXT_WIDTH,
    }
  )

  // "de la Institución Educativa..."
  textoCentrado(
    page,
    `de la Institución Educativa ${nombreInstitucion}`,
    cuerpo.deInstitucion.y,
    {
      font: fonts.regular, size: cuerpo.deInstitucion.fontSize,
      sizeMin: cuerpo.deInstitucion.fontSizeMin,
      color: C.negro, maxWidth: TEXT_WIDTH,
    }
  )

  // "participó y culminó..."
  textoCentrado(
    page,
    "participó y culminó satisfactoriamente las cuatro (4) sesiones formativas de la estrategia",
    cuerpo.participo.y,
    { font: fonts.regular, size: cuerpo.participo.fontSize, color: C.negro, maxWidth: TEXT_WIDTH }
  )

  // ESCUELAS PROMOTORAS DE SALUD – 2026
  textoCentrado(page, "ESCUELAS PROMOTORAS DE SALUD – 2026", cuerpo.estrategia.y, {
    font: fonts.bold, size: cuerpo.estrategia.fontSize,
    color: C.teal, maxWidth: TEXT_WIDTH,
  })

  // "fortaleciendo..."
  textoCentrado(
    page,
    "fortaleciendo sus conocimientos y prácticas para la prevención de las enfermedades",
    cuerpo.fortale1.y,
    { font: fonts.regular, size: cuerpo.fortale1.fontSize, color: C.negro, maxWidth: TEXT_WIDTH }
  )
  textoCentrado(
    page,
    "transmitidas por vectores y la promoción de entornos escolares y comunitarios saludables.",
    cuerpo.fortale2.y,
    { font: fonts.regular, size: cuerpo.fortale2.fontSize, color: C.negro, maxWidth: TEXT_WIDTH }
  )

  // "Se expide en..."
  textoCentrado(
    page,
    `Se expide en ${municipio}, Córdoba, a los ${dia} días del mes de ${mes} de ${anio}.`,
    cuerpo.expedicion.y,
    {
      font: fonts.regular, size: cuerpo.expedicion.fontSize,
      sizeMin: (cuerpo.expedicion as any).fontSizeMin ?? 8,
      color: C.negro, maxWidth: TEXT_WIDTH,
    }
  )
}

// ── Firmas ───────────────────────────────────────────────────────────────

async function dibujarFirmas(
  page: PDFPage,
  doc: PDFDocument,
  fonts: Fonts,
  firmantes: FirmanteData[],
  imagenes: (Uint8Array | null)[]
): Promise<void> {
  const { firmas } = LAYOUT

  // Línea separadora horizontal
  page.drawLine({
    start: { x: MARGIN_H, y: firmas.separadorY },
    end: { x: PAGE_WIDTH - MARGIN_H, y: firmas.separadorY },
    thickness: 0.5, color: C.azul, opacity: 0.3,
  })

  for (let i = 0; i < Math.min(firmantes.length, 3); i++) {
    const f = firmantes[i]
    const cx = firmas.cols[i]
    const imgX = cx - firmas.imagenW / 2

    // Imagen de firma o línea de placeholder
    if (imagenes[i]) {
      try {
        // Intentar PNG, luego JPG
        let img
        try {
          img = await doc.embedPng(imagenes[i]!)
        } catch {
          img = await doc.embedJpg(imagenes[i]!)
        }
        page.drawImage(img, {
          x: imgX, y: firmas.imagenY,
          width: firmas.imagenW, height: firmas.imagenH,
        })
      } catch {
        dibujarLineaFirma(page, cx, firmas.lineaFirmaY, firmas.lineaFirmaW)
      }
    } else {
      // Sin imagen → línea de firma como placeholder
      dibujarLineaFirma(page, cx, firmas.lineaFirmaY, firmas.lineaFirmaW)
    }

    // Nombre del firmante (mayúsculas)
    textoCentrado(page, f.nombre.toUpperCase(), firmas.nombreY, {
      font: fonts.bold, size: firmas.fontSizeNombre,
      color: C.negro, cx, maxWidth: 190,
    })

    // Cargo: mostrar solo el rol (sin la parte "Programa ETV...")
    const rolPuro = f.cargo.includes(" Programa ")
      ? f.cargo.split(" Programa ")[0]
      : f.cargo
    textoCentrado(page, rolPuro, firmas.cargoY, {
      font: fonts.regular, size: firmas.fontSizeCargo,
      color: C.gris, cx, maxWidth: 190,
    })

    // Línea fija institucional
    textoCentrado(page, "Programa ETV y Zoonosis", firmas.etvY, {
      font: fonts.regular, size: firmas.fontSizeCargo,
      color: C.gris, cx, maxWidth: 190,
    })
  }
}

function dibujarLineaFirma(page: PDFPage, cx: number, y: number, w: number): void {
  page.drawLine({
    start: { x: cx - w / 2, y },
    end: { x: cx + w / 2, y },
    thickness: 0.8, color: C.azul, opacity: 0.5,
  })
}

// ── Utilidades de texto ──────────────────────────────────────────────────

interface TextOpts {
  font: PDFFont
  size: number
  sizeMin?: number
  color: Color
  maxWidth?: number
  cx?: number        // centro x personalizado (por defecto: CENTER_X)
}

/**
 * Dibuja texto centrado en cx (por defecto: centro de la página).
 * Si se pasan maxWidth y sizeMin, reduce el tamaño hasta que quepa.
 */
function textoCentrado(
  page: PDFPage,
  texto: string,
  y: number,
  opts: TextOpts
): void {
  const { font, color, maxWidth } = opts
  const cx = opts.cx ?? CENTER_X

  let size = opts.size
  if (maxWidth !== undefined && opts.sizeMin !== undefined) {
    size = ajustarTamanio(font, texto, size, opts.sizeMin, maxWidth)
  }

  const ancho = font.widthOfTextAtSize(texto, size)
  page.drawText(texto, {
    x: cx - ancho / 2,
    y,
    size,
    font,
    color,
  })
}

/**
 * Reduce el tamaño de fuente de sizeMax a sizeMin en pasos de 0.5pt
 * hasta que el texto quepa en maxWidth.
 */
function ajustarTamanio(
  font: PDFFont,
  texto: string,
  sizeMax: number,
  sizeMin: number,
  maxWidth: number
): number {
  let size = sizeMax
  while (size > sizeMin) {
    if (font.widthOfTextAtSize(texto, size) <= maxWidth) break
    size -= 0.5
  }
  return Math.max(size, sizeMin)
}

// ════════ FUNCIÓN PRINCIPAL ════════
// ── CORS ─────────────────────────────────────────────────────────────

const allowedOrigin = Deno.env.get('CORS_ORIGIN') ?? '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': allowedOrigin,
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
        nombre: institucion.nombre,
        municipio: institucion.municipio,
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
  const buf = await crypto.subtle.digest("SHA-256", data)
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