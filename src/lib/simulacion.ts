// Simulación de escenarios "¿qué pasaría si…?": aplica ajustes hipotéticos
// sobre los datos reales (sin guardarlos) para comparar la proyección.

import type { DatosFinancieros } from './agregados'
import type { Ingreso, Gasto, CompraTarjeta, Prestamo, TipoGasto } from '@/models'

export interface ItemPrestamoSim {
  id: string
  valorCuota: number
  cantidadCuotas: number
  desde: string // 'YYYY-MM'
}
export interface ItemCompraSim {
  id: string
  importePorCuota: number
  cantidadCuotas: number
  desde: string
}
export interface ItemIngresoSim {
  id: string
  importe: number
  desde: string
}
export interface ItemGastoSim {
  id: string
  importe: number
  desde: string
  tipo: TipoGasto
}

export interface Escenario {
  ajusteIngresosPct: number
  prestamos: ItemPrestamoSim[]
  compras: ItemCompraSim[]
  ingresos: ItemIngresoSim[]
  gastos: ItemGastoSim[]
}

export const ESCENARIO_VACIO: Escenario = {
  ajusteIngresosPct: 0,
  prestamos: [],
  compras: [],
  ingresos: [],
  gastos: [],
}

/** ¿El escenario tiene algún ajuste aplicado? */
export function escenarioTieneAjustes(e: Escenario): boolean {
  return (
    e.ajusteIngresosPct !== 0 ||
    e.prestamos.length > 0 ||
    e.compras.length > 0 ||
    e.ingresos.length > 0 ||
    e.gastos.length > 0
  )
}

/** Devuelve unos datos financieros nuevos con el escenario aplicado. */
export function aplicarEscenario(d: DatosFinancieros, e: Escenario): DatosFinancieros {
  const factor = 1 + e.ajusteIngresosPct / 100

  const ingresos: Ingreso[] = d.ingresos.map((i) => ({
    ...i,
    importe: Math.round(i.importe * factor),
  }))
  for (const x of e.ingresos) {
    ingresos.push({
      descripcion: 'Ingreso simulado',
      categoria: 'Simulado',
      fecha: `${x.desde}-01`,
      importe: x.importe,
      repeticionMensual: true,
    })
  }

  const gastos: Gasto[] = [...d.gastos]
  for (const x of e.gastos) {
    gastos.push({
      descripcion: 'Gasto simulado',
      categoria: 'Otros',
      fecha: `${x.desde}-01`,
      importe: x.importe,
      repetitivoMensual: true,
      tipo: x.tipo,
    })
  }

  const compras: CompraTarjeta[] = [...d.compras]
  for (const x of e.compras) {
    compras.push({
      tarjetaId: -1,
      descripcion: 'Compra simulada',
      fechaCompra: `${x.desde}-15`,
      cantidadCuotas: x.cantidadCuotas,
      cuotaActual: 1,
      importePorCuota: x.importePorCuota,
    })
  }

  const prestamos: Prestamo[] = [...d.prestamos]
  for (const x of e.prestamos) {
    prestamos.push({
      entidad: 'Préstamo simulado',
      fecha: `${x.desde}-01`,
      capital: 0,
      cantidadCuotas: x.cantidadCuotas,
      valorCuota: x.valorCuota,
      cuotaActual: 1,
    })
  }

  return { ingresos, gastos, compras, prestamos, servicios: d.servicios }
}
