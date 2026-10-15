export const TIPOS_DOCUMENTO = ['RC', 'TI', 'CC', 'CE', 'PPT', 'PEP'] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const TIPOS_LABEL: Record<TipoDocumento, string> = {
  RC: 'Registro Civil',
  TI: 'Tarjeta de Identidad',
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  PPT: 'Permiso por Protección Temporal',
  PEP: 'Permiso Especial de Permanencia',
}

/**
 * Normaliza el número de documento para búsqueda y almacenamiento.
 * Elimina puntos, comas, guiones y espacios; conserva [A-Z0-9].
 */
export function normalizarNumero(raw: string): string {
  return raw
    .replace(/[\s.\-,]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

const MAPA_TIPOS: Record<string, TipoDocumento> = {
  RC: 'RC',
  'REGISTRO CIVIL': 'RC',
  REGISTROCIVIL: 'RC',

  TI: 'TI',
  'TARJETA DE IDENTIDAD': 'TI',
  'TARJETA IDENTIDAD': 'TI',
  TARJETADEIDENTIDAD: 'TI',
  'T.I.': 'TI',

  CC: 'CC',
  CEDULA: 'CC',
  CÉDULA: 'CC',
  'C.C.': 'CC',
  'CEDULA DE CIUDADANIA': 'CC',
  'CÉDULA DE CIUDADANÍA': 'CC',
  'CEDULA CIUDADANIA': 'CC',

  CE: 'CE',
  'CEDULA DE EXTRANJERIA': 'CE',
  'CÉDULA DE EXTRANJERÍA': 'CE',
  'CEDULA EXTRANJERIA': 'CE',
  'C.E.': 'CE',

  PPT: 'PPT',
  'PERMISO DE PROTECCION TEMPORAL': 'PPT',
  'PERMISO PROTECCION TEMPORAL': 'PPT',
  'PERMISO DE PROTECCIÓN TEMPORAL': 'PPT',

  PEP: 'PEP',
  'PERMISO ESPECIAL DE PERMANENCIA': 'PEP',
  'PERMISO ESPECIAL PERMANENCIA': 'PEP',
}

export function normalizarTipoDoc(raw: string): TipoDocumento | null {
  const key = raw.toUpperCase().trim().replace(/\s+/g, ' ')
  return MAPA_TIPOS[key] ?? null
}

export function esTipoValido(tipo: string): tipo is TipoDocumento {
  return TIPOS_DOCUMENTO.includes(tipo as TipoDocumento)
}
