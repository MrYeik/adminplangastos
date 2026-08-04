import { describe, it, expect } from 'vitest'
import { calcularIndicadores } from './indicadores'
import type { DatosFinancieros } from './agregados'

const datos: DatosFinancieros = {
  ingresos: [
    { id: 1, descripcion: 'Sueldo', categoria: 'Sueldo', fecha: '2026-07-01', importe: 100_000_00, repeticionMensual: true },
  ],
  gastos: [
    { id: 1, descripcion: 'Alquiler', categoria: 'Vivienda', fecha: '2026-07-01', importe: 30_000_00, repetitivoMensual: true, tipo: 'fijo' },
    { id: 2, descripcion: 'Súper', categoria: 'Alimentación', fecha: '2026-07-01', importe: 10_000_00, repetitivoMensual: true, tipo: 'variable' },
  ],
  compras: [
    { id: 1, tarjetaId: 1, descripcion: 'TV', fechaCompra: '2026-07-01', cantidadCuotas: 10, cuotaActual: 1, importePorCuota: 5_000_00 },
  ],
  prestamos: [
    { id: 1, entidad: 'Banco', fecha: '2026-07-01', capital: 0, cantidadCuotas: 10, valorCuota: 5_000_00, cuotaActual: 1 },
  ],
}

describe('indicadores financieros', () => {
  it('calcula porcentajes clave', () => {
    // ingresos 100k; gastos 40k (fijo 30k + var 10k); cuotas 10k; egresos 50k; disponible 50k
    const ind = calcularIndicadores(datos, '2026-07')
    expect(ind.tasaAhorro).toBe(50) // 50k / 100k
    expect(ind.comprometidoCuotas).toBe(10) // 10k / 100k
    expect(ind.ratioEgresos).toBe(50) // 50k / 100k
    expect(ind.pctGastosFijos).toBe(75) // 30k / 40k
  })

  it('mide la deuda en meses de ingreso', () => {
    // deuda: TV 10*5k=50k + préstamo 10*5k=50k = 100k ; ingreso 100k -> 1.0 mes
    const ind = calcularIndicadores(datos, '2026-07')
    expect(ind.mesesDeDeuda).toBe(1)
  })

  it('sin ingresos no divide por cero', () => {
    const ind = calcularIndicadores({ ingresos: [], gastos: [], compras: [], prestamos: [] }, '2026-07')
    expect(ind.tasaAhorro).toBe(0)
    expect(ind.mesesDeDeuda).toBe(0)
  })
})
