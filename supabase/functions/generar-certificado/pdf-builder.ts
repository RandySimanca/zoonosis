/**
 * pdf-builder.ts
 * Toda la lógica de generación del PDF del certificado.
 * Usa pdf-lib + @pdf-lib/fontkit para fuentes con soporte de tildes y ñ.
 *
 * Las posiciones y tamaños se leen desde layout.ts — no hay valores
 * numéricos literales aquí para facilitar el ajuste con la plantilla definitiva.
 */

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
  Color,
} from "npm:pdf-lib@1.17.1"
import fontkit from "npm:@pdf-lib/fontkit@1.1.1"

import {
  LAYOUT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_H,
  TEXT_WIDTH,
  CENTER_X,
  COLORES,
  FONT_URLS,
} from "./layout.ts"

// ── Tipos ────────────────────────────────────────────────────────────────

export interface FirmanteData {
  nombre: string
  cargo: string
  firma_path: string
}

export interface CertificadoOpts {
  estudiante: {
    nombre_completo: string
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
  azul:    rgb(COLORES.azul.r,    COLORES.azul.g,    COLORES.azul.b),
  teal:    rgb(COLORES.teal.r,    COLORES.teal.g,    COLORES.teal.b),
  dorado:  rgb(COLORES.dorado.r,  COLORES.dorado.g,  COLORES.dorado.b),
  blanco:  rgb(COLORES.blanco.r,  COLORES.blanco.g,  COLORES.blanco.b),
  negro:   rgb(COLORES.negro.r,   COLORES.negro.g,   COLORES.negro.b),
  gris:    rgb(COLORES.gris.r,    COLORES.gris.g,    COLORES.gris.b),
  fondo:   rgb(COLORES.fondo.r,   COLORES.fondo.g,   COLORES.fondo.b),
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
export async function generarCertificadoPDF(opts: CertificadoOpts): Promise<Uint8Array> {
  const { estudiante, institucion, firmantes, firmasImagenes } = opts

  // Parsear fecha de expedición (forzar mediodía UTC para evitar desfase)
  const fechaObj = new Date(`${institucion.fecha_expedicion}T12:00:00Z`)
  const dia  = fechaObj.getUTCDate()
  const mes  = MESES_ES[fechaObj.getUTCMonth()]
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
      regular: await doc.embedFont(bytesReg),
      bold:    await doc.embedFont(bytesBold),
    }
  } catch (err) {
    // Fallback: Helvetica soporta WinAnsiEncoding (incluye tildes y ñ)
    console.warn("Fuente personalizada no disponible, usando Helvetica:", err)
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold:    await doc.embedFont(StandardFonts.HelveticaBold),
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
    end:   { x: CENTER_X + lineaW / 2, y: titulo.y - 7 },
    thickness: 0.7, color: C.teal, opacity: 0.4,
  })
}

// ── Cuerpo ───────────────────────────────────────────────────────────────

interface CuerpoData {
  nombreEstudiante: string
  nombreInstitucion: string
  municipio: string
  dia: number
  mes: string
  anio: string
}

function dibujarCuerpo(page: PDFPage, fonts: Fonts, data: CuerpoData): void {
  const { cuerpo } = LAYOUT
  const { nombreEstudiante, nombreInstitucion, municipio, dia, mes, anio } = data

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
    end:   { x: CENTER_X + subrayW / 2, y: cuerpo.nombreEstudiante.y - 4 },
    thickness: 0.8, color: C.azul, opacity: 0.3,
  })

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
    end:   { x: PAGE_WIDTH - MARGIN_H, y: firmas.separadorY },
    thickness: 0.5, color: C.azul, opacity: 0.3,
  })

  for (let i = 0; i < Math.min(firmantes.length, 3); i++) {
    const f   = firmantes[i]
    const cx  = firmas.cols[i]
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
    end:   { x: cx + w / 2, y },
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
