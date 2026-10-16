import { describe, expect, it } from 'vitest'
import {
  agruparJornadas,
  parsearFecha,
  parsearFilasEstudiantes,
} from './importar-estudiantes'

const base = {
  contratista: 'Ana Rios',
  municipio: 'Montería',
  'institucion educativa': 'IE Simón Bolívar',
  'NOMBRE COMPLETO DEL ALUMNO': '  Ana  Pérez  ',
  'TIPO DE DOCUMENTO': 'T.I.',
  'NUMERO DE DOCUMENTO': '1.234.567',
  'fecha de entrega del certificado': '15/11/2026',
}

describe('parsearFecha', () => {
  it('acepta DD/MM/AAAA, AAAA-MM-DD y serie de Excel', () => {
    expect(parsearFecha('15/11/2026')).toBe('2026-11-15')
    expect(parsearFecha('2026-11-15')).toBe('2026-11-15')
    expect(parsearFecha('46341')).toBe('2026-11-15')
  })
  it('rechaza fechas inválidas', () => {
    expect(parsearFecha('31/02/2026')).toBeNull()
    expect(parsearFecha('mañana')).toBeNull()
    expect(parsearFecha('')).toBeNull()
  })
})

describe('parsearFilasEstudiantes', () => {
  it('lee las 7 columnas de la plantilla y normaliza valores', () => {
    const r = parsearFilasEstudiantes([base])
    expect(r.errores).toEqual([])
    expect(r.validas).toEqual([
      {
        fila: 2,
        contratista: 'Ana Rios',
        municipio: 'Montería',
        institucion: 'IE Simón Bolívar',
        tipo_documento: 'TI',
        numero_documento: '1234567',
        nombre_completo: 'Ana Pérez',
        fecha_expedicion: '2026-11-15',
      },
    ])
  })

  it('omite filas vacías y reporta errores', () => {
    const r = parsearFilasEstudiantes([
      {},
      { ...base, 'TIPO DE DOCUMENTO': 'PASAPORTE' },
      { ...base, 'NUMERO DE DOCUMENTO': '88', 'NOMBRE COMPLETO DEL ALUMNO': '' },
      { ...base, 'NUMERO DE DOCUMENTO': '77', municipio: '' },
      { ...base, 'NUMERO DE DOCUMENTO': '66', 'fecha de entrega del certificado': 'x' },
    ])
    expect(r.validas).toHaveLength(0)
    expect(r.errores.map((e) => e.fila)).toEqual([3, 4, 5, 6])
    expect(r.errores[1].mensaje).toMatch(/Nombre/)
    expect(r.errores[2].mensaje).toMatch(/Municipio/)
    expect(r.errores[3].mensaje).toMatch(/Fecha/)
  })

  it('detecta documentos duplicados dentro del archivo', () => {
    const r = parsearFilasEstudiantes([base, { ...base, 'TIPO DE DOCUMENTO': 'ti' }])
    expect(r.validas).toHaveLength(1)
    expect(r.errores[0].mensaje).toMatch(/duplicado/)
  })

  it('conserva ceros iniciales en números de documento', () => {
    const r = parsearFilasEstudiantes([
      { ...base, 'NUMERO DE DOCUMENTO': '0012345' },
    ])
    expect(r.validas[0].numero_documento).toBe('0012345')
  })
})

describe('agruparJornadas', () => {
  const fila = (n: number, o: Record<string, string> = {}) =>
    parsearFilasEstudiantes([{ ...base, 'NUMERO DE DOCUMENTO': String(n), ...o }]).validas[0]

  it('agrupa por institución + municipio + contratista + fecha', () => {
    const r = agruparJornadas([
      fila(1),
      fila(2, { 'institucion educativa': 'ie simon bolivar' }),
      fila(3, { municipio: 'Cereté' }),
    ])
    expect(r.errores).toEqual([])
    // Fila 1 y 2 van a la misma jornada (misma inst, mismo contratista, misma fecha)
    // Fila 3 es otra jornada (diferente municipio → diferente institución)
    expect(r.jornadas).toHaveLength(2)
    expect(r.jornadas[0].filas).toHaveLength(2)
  })

  it('diferente contratista en misma institución crea jornada separada (sin error)', () => {
    const r = agruparJornadas([
      fila(1),
      fila(2, { contratista: 'Edgar Morales' }),
    ])
    // Dos jornadas distintas, no un error
    expect(r.jornadas).toHaveLength(2)
    expect(r.errores).toEqual([])
  })

  it('diferente fecha en misma institución crea jornada separada (sin error)', () => {
    const r = agruparJornadas([
      fila(1),
      fila(2, { 'fecha de entrega del certificado': '20/11/2026' }),
    ])
    expect(r.jornadas).toHaveLength(2)
    expect(r.errores).toEqual([])
  })

  it('tres jornadas distintas en la misma institución', () => {
    const r = agruparJornadas([
      fila(1),
      fila(2, { contratista: 'Edgar Morales' }),
      fila(3, { 'fecha de entrega del certificado': '20/11/2026' }),
    ])
    expect(r.jornadas).toHaveLength(3)
    expect(r.errores).toEqual([])
  })
})
