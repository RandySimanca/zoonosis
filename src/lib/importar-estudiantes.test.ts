import { describe, expect, it } from 'vitest'
import { parsearFilasEstudiantes } from './importar-estudiantes'

describe('parsearFilasEstudiantes', () => {
  it('acepta encabezados en español y normaliza valores', () => {
    const r = parsearFilasEstudiantes([
      {
        tipo_documento: 'T.I.',
        numero_documento: '1.234.567',
        nombre_completo: '  Ana  Pérez  ',
      },
    ])
    expect(r.errores).toEqual([])
    expect(r.validas).toEqual([
      { tipo_documento: 'TI', numero_documento: '1234567', nombre_completo: 'Ana Pérez' },
    ])
  })

  it('omite filas vacías y reporta errores de tipo', () => {
    const r = parsearFilasEstudiantes([
      { tipo_documento: '', numero_documento: '', nombre_completo: '' },
      { tipo: 'PASAPORTE', documento: '99', nombre: 'Luis' },
      { tipo: 'CC', documento: '88', nombre: '' },
    ])
    expect(r.validas).toHaveLength(0)
    expect(r.errores).toHaveLength(2)
    expect(r.errores[0].fila).toBe(3)
    expect(r.errores[1].mensaje).toMatch(/Nombre/)
  })

  it('detecta duplicados dentro del archivo', () => {
    const r = parsearFilasEstudiantes([
      { tipo: 'CC', documento: '100', nombre: 'A' },
      { tipo: 'cc', documento: '100', nombre: 'B' },
    ])
    expect(r.validas).toHaveLength(1)
    expect(r.errores[0].mensaje).toMatch(/duplicado/)
  })
})
