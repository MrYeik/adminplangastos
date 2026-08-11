// Genera eventos financieros con fecha para un mes: sueldos, cuotas de tarjetas
// y préstamos, servicios e impuestos. Alimenta el calendario y los recordatorios.

import type { DatosFinancieros } from './agregados'
import { ingresoAplicaAMes, gastoAplicaAMes } from './agregados'
import { tieneCuotaEnMes, mesInicioCompra, cuotasEfectivas, importeCuotaPrestamoEnMes } from './cuotas'
import { importeServicioEnMes } from './servicios'
import { diaDeFecha, fechaConDia, sumarMeses, diasEntreISO } from './dates'

export type TipoEvento = 'ingreso' | 'tarjeta' | 'prestamo' | 'servicio' | 'impuesto' | 'gasto'

export interface EventoFinanciero {
  fecha: string // 'YYYY-MM-DD'
  tipo: TipoEvento
  titulo: string
  detalle?: string
  importe: number // centavos
  servicioId?: number // si el evento viene de un servicio (para marcar pago)
  pagado?: boolean // solo servicios: si está marcado pagado ese mes
}

export interface EstiloTipo {
  label: string
  dot: string // color de fondo del punto/badge
  chip: string // clases tailwind para chip
}

export const ESTILO_TIPO: Record<TipoEvento, EstiloTipo> = {
  ingreso: { label: 'Sueldo / ingreso', dot: '#10b981', chip: 'bg-emerald-50 text-emerald-700' },
  tarjeta: { label: 'Tarjeta', dot: '#f59e0b', chip: 'bg-amber-50 text-amber-700' },
  prestamo: { label: 'Préstamo', dot: '#6366f1', chip: 'bg-indigo-50 text-indigo-700' },
  servicio: { label: 'Servicio', dot: '#0891b2', chip: 'bg-cyan-50 text-cyan-700' },
  impuesto: { label: 'Impuesto', dot: '#dc2626', chip: 'bg-rose-50 text-rose-700' },
  gasto: { label: 'Otro gasto', dot: '#64748b', chip: 'bg-slate-100 text-slate-600' },
}

function tipoDeGasto(categoria: string): TipoEvento {
  if (categoria === 'Servicios') return 'servicio'
  if (categoria === 'Impuestos') return 'impuesto'
  return 'gasto'
}

/** Eventos financieros de un mes 'YYYY-MM', ordenados por fecha. */
export function eventosDelMes(d: DatosFinancieros, mes: string): EventoFinanciero[] {
  const eventos: EventoFinanciero[] = []

  for (const i of d.ingresos) {
    if (ingresoAplicaAMes(i, mes)) {
      eventos.push({
        fecha: fechaConDia(mes, diaDeFecha(i.fecha)),
        tipo: 'ingreso',
        titulo: i.descripcion,
        detalle: i.categoria,
        importe: i.importe,
      })
    }
  }

  for (const g of d.gastos) {
    if (gastoAplicaAMes(g, mes)) {
      eventos.push({
        fecha: fechaConDia(mes, diaDeFecha(g.fecha)),
        tipo: tipoDeGasto(g.categoria),
        titulo: g.descripcion,
        detalle: g.categoria,
        importe: g.importe,
      })
    }
  }

  for (const c of d.compras) {
    const inicio = mesInicioCompra(c)
    if (tieneCuotaEnMes(inicio, cuotasEfectivas(c), mes)) {
      eventos.push({
        fecha: fechaConDia(mes, diaDeFecha(c.fechaCompra)),
        tipo: 'tarjeta',
        titulo: c.descripcion,
        detalle: c.comercio,
        importe: c.importePorCuota,
      })
    }
  }

  for (const p of d.prestamos) {
    const imp = importeCuotaPrestamoEnMes(p, mes)
    if (imp > 0) {
      eventos.push({
        fecha: fechaConDia(mes, diaDeFecha(p.fecha)),
        tipo: 'prestamo',
        titulo: p.entidad,
        importe: imp,
      })
    }
  }

  for (const s of d.servicios ?? []) {
    const imp = importeServicioEnMes(s, mes)
    if (imp > 0) {
      eventos.push({
        fecha: fechaConDia(mes, s.diaVencimiento),
        tipo: 'servicio',
        titulo: s.descripcion,
        detalle: s.tarjetaId != null ? 'Débito en tarjeta' : s.medioPago,
        importe: imp,
        servicioId: s.id,
        pagado: (s.mesesPagados ?? []).includes(mes),
      })
    }
  }

  return eventos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

/** Eventos en un rango de meses (inclusive), ordenados por fecha. */
export function eventosEnRango(
  d: DatosFinancieros,
  mesDesde: string,
  cantidadMeses: number,
): EventoFinanciero[] {
  const todos: EventoFinanciero[] = []
  for (let i = 0; i < cantidadMeses; i++) {
    todos.push(...eventosDelMes(d, sumarMeses(mesDesde, i)))
  }
  return todos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

export interface Recordatorio extends EventoFinanciero {
  diasRestantes: number
}

// Tipos que generan recordatorio (obligaciones a pagar).
const TIPOS_OBLIGACION: TipoEvento[] = ['tarjeta', 'prestamo', 'servicio', 'impuesto']

/**
 * Obligaciones próximas a vencer dentro de `maxDias` desde hoy.
 * Devuelve solo las que aún no vencieron, ordenadas por cercanía.
 */
export function obligacionesProximas(
  d: DatosFinancieros,
  hoy: string,
  maxDias: number,
): Recordatorio[] {
  const mesHoy = hoy.slice(0, 7)
  // Miramos este mes y el siguiente para cubrir el horizonte de aviso.
  const eventos = eventosEnRango(d, mesHoy, 2)
  return eventos
    .filter((e) => TIPOS_OBLIGACION.includes(e.tipo))
    .map((e) => ({ ...e, diasRestantes: diasEntreISO(hoy, e.fecha) }))
    .filter((e) => e.diasRestantes >= 0 && e.diasRestantes <= maxDias)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
}
