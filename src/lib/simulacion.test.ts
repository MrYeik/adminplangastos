import { describe, it, expect } from 'vitest'
import { aplicarEscenario, ESCENARIO_VACIO, escenarioTieneAjustes } from './simulacion'
import { resumenMes } from './agregados'
import type { DatosFinancieros } from './agregados'

const base: DatosFinancieros = {
  ingresos: [
    { id: 1, descripcion: 'Sueldo', categoria: 'Sueldo', fecha: '2026-07-01', importe: 100_000_00, repeticionMensual: true },
  ],
  gastos: [],
  compras: [],
  prestamos: [],
}

describe('simulación de escenarios', () => {
  it('escenario vacío no cambia nada', () => {
    expect(escenarioTieneAjustes(ESCENARIO_VACIO)).toBe(false)
    const d = aplicarEscenario(base, ESCENARIO_VACIO)
    expect(resumenMes(d, '2026-07').ingresos).toBe(100_000_00)
  })

  it('aumento de ingresos del 10% escala los ingresos', () => {
    const d = aplicarEscenario(base, { ...ESCENARIO_VACIO, ajusteIngresosPct: 10 })
    expect(resumenMes(d, '2026-07').ingresos).toBe(110_000_00)
  })

  it('agregar un préstamo suma cuotas en los meses correspondientes', () => {
    const e = {
      ...ESCENARIO_VACIO,
      prestamos: [{ id: 'a', valorCuota: 15_000_00, cantidadCuotas: 36, desde: '2026-08' }],
    }
    const d = aplicarEscenario(base, e)
    // en julio todavía no arranca
    expect(resumenMes(d, '2026-07').cuotasPrestamo).toBe(0)
    // en agosto sí
    expect(resumenMes(d, '2026-08').cuotasPrestamo).toBe(15_000_00)
    // el disponible baja respecto del real
    expect(resumenMes(d, '2026-08').disponible).toBe(100_000_00 - 15_000_00)
  })

  it('combina ajuste de ingresos y gasto extra', () => {
    const e = {
      ...ESCENARIO_VACIO,
      ajusteIngresosPct: 20,
      gastos: [{ id: 'g', importe: 30_000_00, desde: '2026-07', tipo: 'fijo' as const }],
    }
    const d = aplicarEscenario(base, e)
    const r = resumenMes(d, '2026-07')
    expect(r.ingresos).toBe(120_000_00)
    expect(r.gastos).toBe(30_000_00)
    expect(r.disponible).toBe(90_000_00)
  })

  it('no muta los datos originales', () => {
    aplicarEscenario(base, { ...ESCENARIO_VACIO, ajusteIngresosPct: 50 })
    expect(base.ingresos[0].importe).toBe(100_000_00)
  })
})
