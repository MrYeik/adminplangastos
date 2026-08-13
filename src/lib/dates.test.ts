import { describe, it, expect } from 'vitest'
import {
  mesDeFecha,
  sumarMeses,
  diffMeses,
  ventanaMeses,
  etiquetaMes,
  resumenDeFecha,
  periodoResumen,
  fechaVencimientoResumen,
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

  it('resumenDeFecha nombra el resumen por el mes de pago (cierra el mes anterior)', () => {
    // Sin día de cierre = mes calendario
    expect(resumenDeFecha('2026-07-15')).toBe('2026-07')
    // Cierre día 27: el resumen "Agosto" cierra el 27/07 y abarca 28/06–27/07.
    expect(resumenDeFecha('2026-07-15', 27)).toBe('2026-08') // dentro del período
    expect(resumenDeFecha('2026-06-28', 27)).toBe('2026-08') // 1er día del período
    expect(resumenDeFecha('2026-07-27', 27)).toBe('2026-08') // justo el cierre
    expect(resumenDeFecha('2026-07-28', 27)).toBe('2026-09') // pasado el cierre → sig.
  })

  it('resumenDeFecha respeta el override de cierre de un mes puntual', () => {
    // Si el cierre del resumen de Agosto se corrió al 28/07, el 28/07 entra en Agosto.
    const cierres = { '2026-08': '2026-07-28' }
    expect(resumenDeFecha('2026-07-28', 27, cierres)).toBe('2026-08')
  })

  it('periodoResumen: el resumen de un mes cierra el mes anterior', () => {
    const p = periodoResumen('2026-08', 27) // resumen que se paga en agosto
    expect(p.cierre).toBe('2026-07-27')
    expect(p.hasta).toBe('2026-07-27')
    expect(p.desde).toBe('2026-06-28') // día siguiente al cierre anterior (27/06)
  })

  it('fechaVencimientoResumen usa el día habitual dentro del mes de pago', () => {
    expect(fechaVencimientoResumen('2026-08', 10)).toBe('2026-08-10')
    // Override puntual
    expect(fechaVencimientoResumen('2026-08', 10, { '2026-08': '2026-08-12' })).toBe('2026-08-12')
  })
})
