/** Tipos canónicos aceptados por el sistema */
export const TIPOS_DOCUMENTO = ["RC", "TI", "CC", "CE", "PPT", "PEP"] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

/**
 * Normaliza el número de documento para búsqueda y almacenamiento.
 * - Elimina puntos, comas, guiones, espacios
 * - Convierte a mayúsculas
 * - Conserva solo letras y dígitos [A-Z0-9]
 */
export function normalizarNumero(raw: string): string {
  return raw
    .replace(/[\s.\-,]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

/**
 * Mapeo de variantes textuales a valores canónicos.
 * Cubre abreviaciones, errores tipográficos comunes y formatos con puntos.
 */
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

/**
 * Convierte cualquier variante de texto de tipo de documento al valor canónico.
 * Retorna null si no reconoce el tipo.
 */
export function normalizarTipoDoc(raw: string): TipoDocumento | null {
  const key = raw.toUpperCase().trim().replace(/\s+/g, " ")
  return MAPA_TIPOS[key] ?? null
}

/** Verifica que el string sea un tipo de documento válido */
export function esTipoValido(tipo: string): tipo is TipoDocumento {
  return TIPOS_DOCUMENTO.includes(tipo as TipoDocumento)
}
