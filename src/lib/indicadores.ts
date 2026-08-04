// Indicadores financieros derivados del resumen de un mes y la deuda total.

import type { DatosFinancieros } from './agregados'
import { resumenMes, deudaPendiente } from './agregados'

export interface Indicadores {
  /** % del ingreso que queda disponible (capacidad de ahorro). */
  tasaAhorro: number
  /** % del ingreso comprometido en cuotas (tarjetas + préstamos). */
  comprometidoCuotas: number
  /** % del ingreso que se va en egresos totales. */
  ratioEgresos: number
  /** % de los gastos que son fijos (vs. variables). */
  pctGastosFijos: number
  /** Meses de ingreso que equivale la deuda pendiente total. */
  mesesDeDeuda: number
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

export function calcularIndicadores(d: DatosFinancieros, mes: string): Indicadores {
  const r = resumenMes(d, mes)
  const deuda = deudaPendiente(d.compras, d.prestamos, mes)
  return {
    tasaAhorro: pct(r.disponible, r.ingresos),
    comprometidoCuotas: pct(r.cuotas, r.ingresos),
    ratioEgresos: pct(r.egresos, r.ingresos),
    pctGastosFijos: pct(r.gastosFijos, r.gastos),
    mesesDeDeuda: r.ingresos > 0 ? Math.round((deuda / r.ingresos) * 10) / 10 : 0,
  }
}
