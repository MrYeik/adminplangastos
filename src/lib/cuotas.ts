// Motor de cuotas: calcula el cronograma de una compra en tarjeta o de un
// préstamo a partir de sus datos, sin guardar una fila por cuota.
// Esto hace que la proyección se actualice sola y que las cuotas terminadas
// desaparezcan automáticamente de los meses futuros.

import type { CompraTarjeta, Prestamo } from '@/models'
import { mesDeFecha, sumarMeses, diffMeses } from './dates'

export interface CuotaCalculada {
  mes: string // 'YYYY-MM'
  nroCuota: number // 1..cantidadCuotas
  importe: number // centavos
}

/** Mes en que se factura la primera cuota (el mes de la compra). */
export function mesInicioCompra(compra: Pick<CompraTarjeta, 'fechaCompra'>): string {
  return mesDeFecha(compra.fechaCompra)
}

/** Mes en que se paga la primera cuota del préstamo (el mes de otorgamiento). */
export function mesInicioPrestamo(prestamo: Pick<Prestamo, 'fecha'>): string {
  return mesDeFecha(prestamo.fecha)
}

/** Cronograma completo de cuotas de una compra en tarjeta. */
export function cuotasDeCompra(
  compra: Pick<CompraTarjeta, 'fechaCompra' | 'cantidadCuotas' | 'importePorCuota'>,
): CuotaCalculada[] {
  return generarCuotas(mesInicioCompra(compra), compra.cantidadCuotas, compra.importePorCuota)
}

/** Cronograma completo de cuotas de un préstamo. */
export function cuotasDePrestamo(
  prestamo: Pick<Prestamo, 'fecha' | 'cantidadCuotas' | 'valorCuota'>,
): CuotaCalculada[] {
  return generarCuotas(mesInicioPrestamo(prestamo), prestamo.cantidadCuotas, prestamo.valorCuota)
}

/** Generador base: N cuotas consecutivas desde un mes, con importe fijo. */
export function generarCuotas(
  mesInicio: string,
  cantidadCuotas: number,
  importePorCuota: number,
): CuotaCalculada[] {
  const n = Math.max(0, Math.floor(cantidadCuotas))
  return Array.from({ length: n }, (_, i) => ({
    mes: sumarMeses(mesInicio, i),
    nroCuota: i + 1,
    importe: importePorCuota,
  }))
}

/** Mes de la última cuota (fecha de finalización). Null si no tiene cuotas. */
export function mesFinalizacion(mesInicio: string, cantidadCuotas: number): string | null {
  if (cantidadCuotas < 1) return null
  return sumarMeses(mesInicio, cantidadCuotas - 1)
}

/** Devuelve la cuota que cae en un mes dado, o null si no hay ninguna. */
export function cuotaEnMes(cuotas: CuotaCalculada[], mes: string): CuotaCalculada | null {
  return cuotas.find((c) => c.mes === mes) ?? null
}

/**
 * Número de cuota vigente en un mes de referencia:
 *  - 0 si el mes es anterior a la primera cuota (todavía no arrancó)
 *  - 1..cantidadCuotas si está en curso
 *  - cantidadCuotas si el mes es posterior a la última (ya terminó)
 */
export function nroCuotaEnMes(
  mesInicio: string,
  cantidadCuotas: number,
  mesRef: string,
): number {
  if (cantidadCuotas < 1) return 0
  const idx = diffMeses(mesInicio, mesRef) // 0 = primera cuota
  if (idx < 0) return 0
  if (idx >= cantidadCuotas) return cantidadCuotas
  return idx + 1
}

/** Cantidad de cuotas que faltan pagar a partir de (incluyendo) un mes. */
export function cuotasRestantes(cuotas: CuotaCalculada[], desdeMes: string): number {
  return cuotas.filter((c) => c.mes >= desdeMes).length
}

/** Total pendiente (suma de cuotas) a partir de (incluyendo) un mes. */
export function totalPendiente(cuotas: CuotaCalculada[], desdeMes: string): number {
  return cuotas
    .filter((c) => c.mes >= desdeMes)
    .reduce((acc, c) => acc + c.importe, 0)
}

/** Próximo vencimiento (mes) a partir de un mes de referencia, o null si ya terminó. */
export function proximoVencimiento(cuotas: CuotaCalculada[], desdeMes: string): string | null {
  const futura = cuotas.find((c) => c.mes >= desdeMes)
  return futura ? futura.mes : null
}

/** ¿La compra/préstamo sigue activa en un mes dado? */
export function estaActivaEnMes(cuotas: CuotaCalculada[], mes: string): boolean {
  return cuotaEnMes(cuotas, mes) !== null
}

/** ¿Cae una cuota en un mes dado? (sin generar el cronograma completo) */
export function tieneCuotaEnMes(mesInicio: string, cantidadCuotas: number, mes: string): boolean {
  const idx = diffMeses(mesInicio, mes)
  return idx >= 0 && idx < cantidadCuotas
}

/** Importe de la cuota que cae en un mes (0 si no hay cuota ese mes). */
export function importeCuotaEnMes(
  mesInicio: string,
  cantidadCuotas: number,
  importePorCuota: number,
  mes: string,
): number {
  return tieneCuotaEnMes(mesInicio, cantidadCuotas, mes) ? importePorCuota : 0
}

export interface ResumenCuotas {
  mesInicio: string
  mesFin: string | null
  cantidadCuotas: number
  cuotaActual: number // 0..cantidadCuotas (0 = todavía no arrancó)
  cuotasRestantes: number
  importePorCuota: number
  totalOriginal: number
  totalPendiente: number
  proximoVencimiento: string | null
  activa: boolean
}

/** Resumen completo de un plan de cuotas visto desde un mes de referencia. */
export function resumenDesde(
  mesInicio: string,
  cantidadCuotas: number,
  importePorCuota: number,
  mesRef: string,
): ResumenCuotas {
  const cuotas = generarCuotas(mesInicio, cantidadCuotas, importePorCuota)
  return {
    mesInicio,
    mesFin: mesFinalizacion(mesInicio, cantidadCuotas),
    cantidadCuotas,
    cuotaActual: nroCuotaEnMes(mesInicio, cantidadCuotas, mesRef),
    cuotasRestantes: cuotasRestantes(cuotas, mesRef),
    importePorCuota,
    totalOriginal: cantidadCuotas * importePorCuota,
    totalPendiente: totalPendiente(cuotas, mesRef),
    proximoVencimiento: proximoVencimiento(cuotas, mesRef),
    activa: estaActivaEnMes(cuotas, mesRef),
  }
}

export function resumenCompra(
  compra: Pick<CompraTarjeta, 'fechaCompra' | 'cantidadCuotas' | 'importePorCuota'>,
  mesRef: string,
): ResumenCuotas {
  return resumenDesde(
    mesInicioCompra(compra),
    compra.cantidadCuotas,
    compra.importePorCuota,
    mesRef,
  )
}

export function resumenPrestamo(
  prestamo: Pick<Prestamo, 'fecha' | 'cantidadCuotas' | 'valorCuota'>,
  mesRef: string,
): ResumenCuotas {
  return resumenDesde(
    mesInicioPrestamo(prestamo),
    prestamo.cantidadCuotas,
    prestamo.valorCuota,
    mesRef,
  )
}
