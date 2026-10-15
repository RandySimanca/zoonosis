import { normalizarNumero, normalizarTipoDoc, type TipoDocumento } from './normalize'

export interface FilaEstudiante {
  tipo_documento: TipoDocumento
  numero_documento: string
  nombre_completo: string
}

export interface ErrorFila {
  fila: number
  mensaje: string
}

export interface ResultadoImportacion {
  validas: FilaEstudiante[]
  errores: ErrorFila[]
}

function claveHeader(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
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

export function parsearFilasEstudiantes(rows: Record<string, unknown>[]): ResultadoImportacion {
  const validas: FilaEstudiante[] = []
  const errores: ErrorFila[] = []
  const vistos = new Set<string>()

  rows.forEach((row, idx) => {
    const fila = idx + 2
    const tipoRaw = valorCelda(row, ['tipodocumento', 'tipo', 'td'])
    const numeroRaw = valorCelda(row, ['numerodocumento', 'documento', 'identificacion', 'numero'])
    const nombreRaw = valorCelda(row, ['nombrecompleto', 'nombre', 'estudiante'])

    if (!tipoRaw && !numeroRaw && !nombreRaw) return

    const tipo = normalizarTipoDoc(tipoRaw)
    const numero = normalizarNumero(numeroRaw)
    const nombre = nombreRaw.replace(/\s+/g, ' ').trim()

    if (!tipo) {
      errores.push({ fila, mensaje: `Tipo de documento no válido: "${tipoRaw}"` })
      return
    }
    if (!numero) {
      errores.push({ fila, mensaje: 'Número de documento vacío o inválido' })
      return
    }
    if (!nombre) {
      errores.push({ fila, mensaje: 'Nombre completo vacío' })
      return
    }

    const clave = `${tipo}:${numero}`
    if (vistos.has(clave)) {
      errores.push({ fila, mensaje: `Documento duplicado en el archivo: ${tipo} ${numero}` })
      return
    }
    vistos.add(clave)
    validas.push({ tipo_documento: tipo, numero_documento: numero, nombre_completo: nombre })
  })

  return { validas, errores }
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
      errores: [{ fila: 1, mensaje: 'No hay filas de datos. Use las columnas tipo_documento, numero_documento, nombre_completo.' }],
    }
  }
  return parsearFilasEstudiantes(rows)
}
