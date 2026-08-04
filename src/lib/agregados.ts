// Agregación mensual: combina ingresos, gastos y cuotas (tarjetas + préstamos)
// para un mes dado, considerando la recurrencia de ingresos/gastos.

import type { Ingreso, Gasto, CompraTarjeta, Prestamo, Servicio, TipoGasto } from '@/models'
import { mesDeFecha } from './dates'
import {
  importeCuotaEnMes,
  mesInicioCompra,
  mesInicioPrestamo,
  resumenCompra,
  resumenPrestamo,
} from './cuotas'
import { importeServicioEnMes, serviciosDelMes } from './servicios'

export interface DatosFinancieros {
  ingresos: Ingreso[]
  gastos: Gasto[]
  compras: CompraTarjeta[]
  prestamos: Prestamo[]
  servicios?: Servicio[]
}

/** ¿Un ingreso aplica a un mes? (recurrente: desde su mes en adelante) */
export function ingresoAplicaAMes(i: Ingreso, mes: string): boolean {
  const inicio = mesDeFecha(i.fecha)
  return i.repeticionMensual ? mes >= inicio : mes === inicio
}

/** ¿Un gasto aplica a un mes? (recurrente: desde su mes en adelante) */
export function gastoAplicaAMes(g: Gasto, mes: string): boolean {
  const inicio = mesDeFecha(g.fecha)
  return g.repetitivoMensual ? mes >= inicio : mes === inicio
}

export function ingresosDelMes(ingresos: Ingreso[], mes: string): number {
  return ingresos.filter((i) => ingresoAplicaAMes(i, mes)).reduce((a, i) => a + i.importe, 0)
}

export function gastosDelMes(gastos: Gasto[], mes: string, tipo?: TipoGasto): number {
  return gastos
    .filter((g) => gastoAplicaAMes(g, mes) && (tipo == null || g.tipo === tipo))
    .reduce((a, g) => a + g.importe, 0)
}

export function cuotasTarjetaDelMes(compras: CompraTarjeta[], mes: string): number {
  return compras.reduce(
    (a, c) =>
      a + importeCuotaEnMes(mesInicioCompra(c), c.cantidadCuotas, c.importePorCuota, mes),
    0,
  )
}

export function cuotasPrestamoDelMes(prestamos: Prestamo[], mes: string): number {
  return prestamos.reduce(
    (a, p) => a + importeCuotaEnMes(mesInicioPrestamo(p), p.cantidadCuotas, p.valorCuota, mes),
    0,
  )
}

export interface ResumenMes {
  mes: string
  ingresos: number
  gastosFijos: number
  gastosVariables: number
  gastos: number
  cuotasTarjeta: number
  cuotasPrestamo: number
  cuotas: number
  servicios: number
  egresos: number
  disponible: number
}

/** Resumen financiero completo de un mes. */
export function resumenMes(d: DatosFinancieros, mes: string): ResumenMes {
  const ingresos = ingresosDelMes(d.ingresos, mes)
  const gastosFijos = gastosDelMes(d.gastos, mes, 'fijo')
  const gastosVariables = gastosDelMes(d.gastos, mes, 'variable')
  const gastos = gastosFijos + gastosVariables
  const cuotasTarjeta = cuotasTarjetaDelMes(d.compras, mes)
  const cuotasPrestamo = cuotasPrestamoDelMes(d.prestamos, mes)
  const cuotas = cuotasTarjeta + cuotasPrestamo
  const servicios = serviciosDelMes(d.servicios ?? [], mes)
  const egresos = gastos + cuotas + servicios
  return {
    mes,
    ingresos,
    gastosFijos,
    gastosVariables,
    gastos,
    cuotasTarjeta,
    cuotasPrestamo,
    cuotas,
    servicios,
    egresos,
    disponible: ingresos - egresos,
  }
}

/** Serie de resúmenes para una ventana de meses. */
export function serieMensual(d: DatosFinancieros, meses: string[]): ResumenMes[] {
  return meses.map((m) => resumenMes(d, m))
}

export interface GastoCategoria {
  categoria: string
  total: number
}

/**
 * Distribución de egresos por categoría en un mes.
 * Incluye los gastos por su categoría y las cuotas como categoría "Cuotas".
 */
export function egresosPorCategoria(d: DatosFinancieros, mes: string): GastoCategoria[] {
  const mapa = new Map<string, number>()
  for (const g of d.gastos) {
    if (gastoAplicaAMes(g, mes)) {
      mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + g.importe)
    }
  }
  for (const s of d.servicios ?? []) {
    const imp = importeServicioEnMes(s, mes)
    if (imp > 0) mapa.set(s.categoria, (mapa.get(s.categoria) ?? 0) + imp)
  }
  const cuotas = cuotasTarjetaDelMes(d.compras, mes) + cuotasPrestamoDelMes(d.prestamos, mes)
  if (cuotas > 0) mapa.set('Cuotas', (mapa.get('Cuotas') ?? 0) + cuotas)

  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

/** Deuda total pendiente (tarjetas + préstamos) desde un mes de referencia. */
export function deudaPendiente(
  compras: CompraTarjeta[],
  prestamos: Prestamo[],
  mesRef: string,
): number {
  const t = compras.reduce((a, c) => a + resumenCompra(c, mesRef).totalPendiente, 0)
  const p = prestamos.reduce((a, pr) => a + resumenPrestamo(pr, mesRef).totalPendiente, 0)
  return t + p
}

export interface Vencimiento {
  tipo: 'tarjeta' | 'prestamo'
  descripcion: string
  mes: string
  importe: number
}

/** Próximos vencimientos de cuotas (tarjetas + préstamos) desde un mes. */
export function proximosVencimientos(
  compras: CompraTarjeta[],
  prestamos: Prestamo[],
  mesRef: string,
): Vencimiento[] {
  const vencs: Vencimiento[] = []
  for (const c of compras) {
    const r = resumenCompra(c, mesRef)
    if (r.proximoVencimiento) {
      vencs.push({
        tipo: 'tarjeta',
        descripcion: c.descripcion,
        mes: r.proximoVencimiento,
        importe: c.importePorCuota,
      })
    }
  }
  for (const p of prestamos) {
    const r = resumenPrestamo(p, mesRef)
    if (r.proximoVencimiento) {
      vencs.push({
        tipo: 'prestamo',
        descripcion: p.entidad,
        mes: r.proximoVencimiento,
        importe: p.valorCuota,
      })
    }
  }
  return vencs.sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0))
}
