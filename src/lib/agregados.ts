// Agregación mensual: combina ingresos, gastos y cuotas (tarjetas + préstamos)
// para un mes dado, considerando la recurrencia de ingresos/gastos.

import type { Ingreso, Gasto, CompraTarjeta, Prestamo, Servicio, TipoGasto } from '@/models'
import { mesDeFecha, sumarMeses } from './dates'
import {
  importeCuotaPrestamoEnMes,
  importeCompraEnMes,
  resumenCompra,
  resumenPrestamo,
} from './cuotas'
import { estaPagado } from './pagos'
import { importeVigenteEnMes } from './vigencia'
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
  return ingresos
    .filter((i) => ingresoAplicaAMes(i, mes))
    .reduce((a, i) => a + importeVigenteEnMes(i.importe, i.importes, mes), 0)
}

export function gastosDelMes(gastos: Gasto[], mes: string, tipo?: TipoGasto): number {
  return gastos
    .filter((g) => gastoAplicaAMes(g, mes) && (tipo == null || g.tipo === tipo))
    .reduce((a, g) => a + importeVigenteEnMes(g.importe, g.importes, mes), 0)
}

export function cuotasTarjetaDelMes(compras: CompraTarjeta[], mes: string): number {
  return compras.reduce((a, c) => a + importeCompraEnMes(c, mes), 0)
}

/** Total de gastos del mes ya marcados como pagados. */
export function gastosPagadosDelMes(gastos: Gasto[], mes: string): number {
  return gastos
    .filter((g) => gastoAplicaAMes(g, mes) && estaPagado(g.mesesPagados, mes))
    .reduce((a, g) => a + importeVigenteEnMes(g.importe, g.importes, mes), 0)
}

/** ¿Un ingreso está marcado como depositado/cobrado en un mes? */
export function ingresoCobradoEnMes(i: Ingreso, mes: string): boolean {
  return ingresoAplicaAMes(i, mes) && estaPagado(i.mesesCobrado, mes)
}

/** Total de ingresos del mes ya depositados (marcados como cobrados). */
export function ingresosCobradosDelMes(ingresos: Ingreso[], mes: string): number {
  return ingresos
    .filter((i) => ingresoCobradoEnMes(i, mes))
    .reduce((a, i) => a + importeVigenteEnMes(i.importe, i.importes, mes), 0)
}

/**
 * Disponible REAL (caja) de un mes: solo lo cobrado menos lo que efectivamente
 * sale. Los ingresos suman recién al marcarse depositados; de los gastos, solo
 * restan los pagados; los débitos automáticos (servicios, tarjeta, préstamos)
 * restan siempre. Sirve para el saldo del mes en curso.
 */
export function disponibleEfectivoDelMes(d: DatosFinancieros, mes: string): number {
  const cobrado = ingresosCobradosDelMes(d.ingresos, mes)
  const gastosPag = gastosPagadosDelMes(d.gastos, mes)
  const autos =
    serviciosDelMes(d.servicios ?? [], mes) +
    cuotasTarjetaDelMes(d.compras, mes) +
    cuotasPrestamoDelMes(d.prestamos, mes)
  return cobrado - gastosPag - autos
}

export function cuotasPrestamoDelMes(prestamos: Prestamo[], mes: string): number {
  return prestamos.reduce((a, p) => a + importeCuotaPrestamoEnMes(p, mes), 0)
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

/**
 * Saldo que se arrastra desde los meses anteriores (cuenta corriente): suma del
 * disponible de cada mes desde `mesInicio` hasta el mes previo a `mes`. Puede
 * ser negativo (si se gastó de más). 0 en el mes de inicio o antes.
 */
export function saldoArrastrado(d: DatosFinancieros, mes: string, mesInicio: string): number {
  if (mes <= mesInicio) return 0
  let acc = 0
  for (let k = mesInicio; k < mes; k = sumarMeses(k, 1)) {
    acc += resumenMes(d, k).disponible
  }
  return acc
}

export interface FilaDesglose {
  label: string
  valores: number[] // un valor por mes de la ventana
  total: number
}

function fila(label: string, valores: number[]): FilaDesglose {
  return { label, valores, total: valores.reduce((a, b) => a + b, 0) }
}

/** Desglose por ítem de cada concepto de la proyección, para una ventana de meses. */
export function desgloseProyeccion(
  d: DatosFinancieros,
  meses: string[],
  tarjetas: { id?: number; nombre: string }[],
): Record<string, FilaDesglose[]> {
  const desg: Record<string, FilaDesglose[]> = {
    ingresos: [],
    gastosFijos: [],
    gastosVariables: [],
    cuotasTarjeta: [],
    cuotasPrestamo: [],
    servicios: [],
  }
  const conValor = (vals: number[]) => vals.some((v) => v !== 0)

  for (const i of d.ingresos) {
    const vals = meses.map((m) => (ingresoAplicaAMes(i, m) ? importeVigenteEnMes(i.importe, i.importes, m) : 0))
    if (conValor(vals)) desg.ingresos.push(fila(i.descripcion, vals))
  }
  for (const g of d.gastos) {
    const vals = meses.map((m) => (gastoAplicaAMes(g, m) ? importeVigenteEnMes(g.importe, g.importes, m) : 0))
    if (conValor(vals)) (g.tipo === 'fijo' ? desg.gastosFijos : desg.gastosVariables).push(fila(g.descripcion, vals))
  }
  for (const t of tarjetas) {
    const suyas = d.compras.filter((c) => c.tarjetaId === t.id)
    const vals = meses.map((m) => suyas.reduce((a, c) => a + importeCompraEnMes(c, m), 0))
    if (conValor(vals)) desg.cuotasTarjeta.push(fila(t.nombre, vals))
  }
  for (const p of d.prestamos) {
    const vals = meses.map((m) => importeCuotaPrestamoEnMes(p, m))
    if (conValor(vals)) desg.cuotasPrestamo.push(fila(p.entidad, vals))
  }
  for (const s of d.servicios ?? []) {
    const vals = meses.map((m) => importeServicioEnMes(s, m))
    if (conValor(vals)) desg.servicios.push(fila(s.descripcion, vals))
  }
  return desg
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
      mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + importeVigenteEnMes(g.importe, g.importes, mes))
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
  const t = compras
    .filter((c) => !c.servicioRecurrente)
    .reduce((a, c) => a + resumenCompra(c, mesRef).totalPendiente, 0)
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
        importe: importeCuotaPrestamoEnMes(p, r.proximoVencimiento),
      })
    }
  }
  return vencs.sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0))
}
