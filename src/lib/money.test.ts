import { describe, it, expect } from 'vitest'
import { aCentavos, aPesos, formatMoney, parseMoney } from './money'

describe('utilidades de dinero', () => {
  it('convierte pesos a centavos y viceversa', () => {
    expect(aCentavos(50000)).toBe(5_000_000)
    expect(aCentavos(1234.56)).toBe(123456)
    expect(aPesos(5_000_000)).toBe(50000)
  })

  it('formatea con separador de miles es-AR', () => {
    expect(formatMoney(5_000_000)).toBe('$50.000')
    expect(formatMoney(123456789)).toBe('$1.234.568')
    expect(formatMoney(0)).toBe('$0')
  })

  it('coloca el signo negativo antes del símbolo', () => {
    expect(formatMoney(-5_000_000)).toBe('-$50.000')
    expect(formatMoney(-123456, '$', true)).toBe('-$1.234,56')
  })

  it('formatea con decimales cuando se pide', () => {
    expect(formatMoney(123456, '$', true)).toBe('$1.234,56')
  })

  it('respeta un símbolo distinto', () => {
    expect(formatMoney(5_000_000, 'US$')).toBe('US$50.000')
  })

  it('parsea texto en formato es-AR a centavos', () => {
    expect(parseMoney('1.234,56')).toBe(123456)
    expect(parseMoney('50.000')).toBe(5_000_000)
    expect(parseMoney('1234.56')).toBe(123456)
    expect(parseMoney('$ 50.000')).toBe(5_000_000)
    expect(parseMoney('')).toBe(0)
    expect(parseMoney('abc')).toBe(0)
  })
})
