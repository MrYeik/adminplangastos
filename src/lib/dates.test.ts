import { describe, it, expect } from 'vitest'
import {
  mesDeFecha,
  sumarMeses,
  diffMeses,
  ventanaMeses,
  etiquetaMes,
} from './dates'

describe('utilidades de fechas', () => {
  it('extrae el mes de una fecha ISO', () => {
    expect(mesDeFecha('2026-07-15')).toBe('2026-07')
  })

  it('suma y resta meses cruzando años', () => {
    expect(sumarMeses('2026-07', 1)).toBe('2026-08')
    expect(sumarMeses('2026-12', 1)).toBe('2027-01')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
    expect(sumarMeses('2026-07', 12)).toBe('2027-07')
  })

  it('calcula diferencia en meses', () => {
    expect(diffMeses('2026-07', '2026-07')).toBe(0)
    expect(diffMeses('2026-07', '2027-07')).toBe(12)
    expect(diffMeses('2027-01', '2026-07')).toBe(-6)
  })

  it('genera una ventana de N meses', () => {
    const v = ventanaMeses('2026-07', 12)
    expect(v).toHaveLength(12)
    expect(v[0]).toBe('2026-07')
    expect(v[11]).toBe('2027-06')
  })

  it('arma etiquetas legibles', () => {
    expect(etiquetaMes('2026-07')).toBe('Jul 2026')
    expect(etiquetaMes('2026-07', true)).toBe('Julio 2026')
  })
})
