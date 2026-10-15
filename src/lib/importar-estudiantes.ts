import { normalizarNumero, normalizarTipoDoc, type TipoDocumento } from './normalize'

/** Una fila válida del Excel, ya normalizada. */
export interface FilaEstudiante {
  fila: number
  contratista: string
  municipio: string
  institucion: string
  tipo_documento: TipoDocumento
  numero_documento: string
  nombre_completo: string
  /** Fecha de entrega del certificado, formato YYYY-MM-DD */
  fecha_expedicion: string
}

export interface ErrorFila {
  fila: number
  mensaje: string
}

export interface ResultadoImportacion {
  validas: FilaEstudiante[]
  errores: ErrorFila[]
}

/** Institución resultante de agrupar las filas del archivo. */
export interface InstitucionImportada {
  clave: string
  nombre: string
  municipio: string
  fecha_expedicion: string
  contratista: string
  filas: FilaEstudiante[]
}

export const COLUMNAS_PLANTILLA = [
  'contratista',
  'municipio',
  'institucion educativa',
  'NOMBRE COMPLETO DEL ALUMNO',
  'TIPO DE DOCUMENTO',
  'NUMERO DE DOCUMENTO',
  'fecha de entrega del certificado',
] as const

/** Minúsculas, sin tildes ni signos, espacios colapsados. Sirve para comparar nombres. */
export function normalizarClave(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function claveHeader(raw: string): string {
  return normalizarClave(raw).replace(/ /g, '')
}

function valorCelda(row: Record<string, unknown>, aliases: string[]): string {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) {
    map.set(claveHeader(k), v)
  }
  for (const alias of aliases) {
    const v = map.get(alias)
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

function limpiarTexto(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function aIso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

/**
 * Convierte la fecha del Excel a YYYY-MM-DD.
 * Acepta: número de serie de Excel, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (día primero).
 */
export function parsearFecha(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s))
    if (serial < 20000 || serial > 80000) return null
    return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10)
  }

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s)
  if (m) return aIso(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s)
  if (m) return aIso(Number(m[3]), Number(m[2]), Number(m[1]))

  return null
}

export function parsearFilasEstudiantes(rows: Record<string, unknown>[]): ResultadoImportacion {
  const validas: FilaEstudiante[] = []
  const errores: ErrorFila[] = []
  const vistos = new Set<string>()

  rows.forEach((row, idx) => {
    const fila = idx + 2
    const contratistaRaw = valorCelda(row, ['contratista'])
    const municipioRaw = valorCelda(row, ['municipio'])
    const institucionRaw = valorCelda(row, ['institucioneducativa', 'institucion', 'colegio'])
    const nombreRaw = valorCelda(row, [
      'nombrecompletodelalumno',
      'nombrecompleto',
      'nombre',
      'alumno',
      'estudiante',
    ])
    const tipoRaw = valorCelda(row, ['tipodedocumento', 'tipodocumento', 'tipo', 'td'])
    const numeroRaw = valorCelda(row, [
      'numerodedocumento',
      'numerodocumento',
      'documento',
      'identificacion',
      'numero',
    ])
    const fechaRaw = valorCelda(row, [
      'fechadeentregadelcertificado',
      'fechadeentrega',
      'fechaentrega',
      'fechaexpedicion',
      'fecha',
    ])

    if (
      !contratistaRaw && !municipioRaw && !institucionRaw && !nombreRaw &&
      !tipoRaw && !numeroRaw && !fechaRaw
    ) {
      return
    }

    const tipo = normalizarTipoDoc(tipoRaw)
    const numero = normalizarNumero(numeroRaw)
    const nombre = limpiarTexto(nombreRaw)
    const contratista = limpiarTexto(contratistaRaw)
    const municipio = limpiarTexto(municipioRaw)
    const institucion = limpiarTexto(institucionRaw)

    if (!contratista) return void errores.push({ fila, mensaje: 'Contratista vacío' })
    if (!municipio) return void errores.push({ fila, mensaje: 'Municipio vacío' })
    if (!institucion) return void errores.push({ fila, mensaje: 'Institución educativa vacía' })
    if (!tipo) {
      return void errores.push({ fila, mensaje: `Tipo de documento no válido: "${tipoRaw}"` })
    }
    if (!numero) return void errores.push({ fila, mensaje: 'Número de documento vacío o inválido' })
    if (!nombre) return void errores.push({ fila, mensaje: 'Nombre completo vacío' })

    const fecha = parsearFecha(fechaRaw)
    if (!fecha) {
      return void errores.push({
        fila,
        mensaje: `Fecha de entrega no válida: "${fechaRaw}" (use DD/MM/AAAA o AAAA-MM-DD)`,
      })
    }

    const clave = `${tipo}:${numero}`
    if (vistos.has(clave)) {
      return void errores.push({ fila, mensaje: `Documento duplicado en el archivo: ${tipo} ${numero}` })
    }
    vistos.add(clave)

    validas.push({
      fila,
      contratista,
      municipio,
      institucion,
      tipo_documento: tipo,
      numero_documento: numero,
      nombre_completo: nombre,
      fecha_expedicion: fecha,
    })
  })

  return { validas, errores }
}

/**
 * Agrupa las filas por institución (nombre + municipio).
 * Cada institución tiene un solo contratista y una sola fecha: las filas que
 * contradigan a la primera de su institución se reportan como error.
 */
export function agruparInstituciones(filas: FilaEstudiante[]): {
  instituciones: InstitucionImportada[]
  errores: ErrorFila[]
} {
  const mapa = new Map<string, InstitucionImportada>()
  const errores: ErrorFila[] = []

  for (const f of filas) {
    const clave = `${normalizarClave(f.institucion)}|${normalizarClave(f.municipio)}`
    const actual = mapa.get(clave)
    if (!actual) {
      mapa.set(clave, {
        clave,
        nombre: f.institucion,
        municipio: f.municipio,
        fecha_expedicion: f.fecha_expedicion,
        contratista: f.contratista,
        filas: [f],
      })
      continue
    }
    if (normalizarClave(f.contratista) !== normalizarClave(actual.contratista)) {
      errores.push({
        fila: f.fila,
        mensaje: `"${f.institucion}" ya tiene otro contratista en el archivo ("${actual.contratista}")`,
      })
      continue
    }
    if (f.fecha_expedicion !== actual.fecha_expedicion) {
      errores.push({
        fila: f.fila,
        mensaje: `"${f.institucion}" ya tiene otra fecha de entrega en el archivo (${actual.fecha_expedicion})`,
      })
      continue
    }
    actual.filas.push(f)
  }

  return { instituciones: [...mapa.values()], errores }
}

export async function parsearArchivoEstudiantes(buffer: ArrayBuffer): Promise<ResultadoImportacion> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const hoja = wb.Sheets[wb.SheetNames[0]]
  if (!hoja) {
    return { validas: [], errores: [{ fila: 1, mensaje: 'El archivo no contiene hojas' }] }
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })
  if (rows.length === 0) {
    return {
      validas: [],
      errores: [
        {
          fila: 1,
          mensaje: `No hay filas de datos. Columnas esperadas: ${COLUMNAS_PLANTILLA.join(', ')}.`,
        },
      ],
    }
  }
  return parsearFilasEstudiantes(rows)
}
