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
export const PAGE_WIDTH = 841.89   // 297 mm en puntos
export const PAGE_HEIGHT = 595.28  // 210 mm en puntos

// Margen horizontal del área de texto (izquierda y derecha)
export const MARGIN_H = 48
export const TEXT_WIDTH = PAGE_WIDTH - MARGIN_H * 2  // ~745.89 pts
export const CENTER_X = PAGE_WIDTH / 2               // ~420.945 pts

// ── Colores (valores RGB 0–1) ────────────────────────────────────────────
export const COLORES = {
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
export const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.1.1/files/noto-sans-latin-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.1.1/files/noto-sans-latin-700-normal.woff",
}

// ── Elementos del certificado ────────────────────────────────────────────
export const LAYOUT = {

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