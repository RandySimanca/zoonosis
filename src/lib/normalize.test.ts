import { describe, expect, it } from 'vitest'
import { esTipoValido, normalizarNumero, normalizarTipoDoc } from './normalize'

describe('normalizarNumero', () => {
  it('quita puntos, comas, guiones y espacios', () => {
    expect(normalizarNumero('1.234.567-8')).toBe('12345678')
    expect(normalizarNumero('  12 345  ')).toBe('12345')
    expect(normalizarNumero('AB-12,34')).toBe('AB1234')
  })

  it('pasa a mayúsculas y descarta otros símbolos', () => {
    expect(normalizarNumero('ab12#xy')).toBe('AB12XY')
  })

  it('retorna vacío si no hay caracteres útiles', () => {
    expect(normalizarNumero('...')).toBe('')
  })
})

describe('normalizarTipoDoc', () => {
  it('reconoce códigos y variantes textuales', () => {
    expect(normalizarTipoDoc('ti')).toBe('TI')
    expect(normalizarTipoDoc('Tarjeta de Identidad')).toBe('TI')
    expect(normalizarTipoDoc('cédula de ciudadanía')).toBe('CC')
    expect(normalizarTipoDoc('C.C.')).toBe('CC')
    expect(normalizarTipoDoc('ppt')).toBe('PPT')
  })

  it('retorna null si no reconoce el tipo', () => {
    expect(normalizarTipoDoc('PASAPORTE')).toBeNull()
    expect(normalizarTipoDoc('')).toBeNull()
  })
})

describe('esTipoValido', () => {
  it('acepta solo los tipos canónicos', () => {
    expect(esTipoValido('CC')).toBe(true)
    expect(esTipoValido('XX')).toBe(false)
  })
})
