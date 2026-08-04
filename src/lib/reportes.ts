// Construye la estructura de datos de un reporte (mensual o anual) lista para
// mostrar en pantalla y exportar a PDF/Excel.

import type { DatosFinancieros } from './agregados'
import { resumenMes, serieMensual } from './agregados'
import { eventosDelMes, ESTILO_TIPO } from './eventos'
import { ventanaMeses, etiquetaMes, fechaLegible } from './dates'
import { formatMoney } from './money'
import type { ReporteData } from './exportar'

/** Reporte de un mes: resumen + detalle de movimientos. */
export function reporteMensual(d: DatosFinancieros, mes: string): ReporteData {
  const r = resumenMes(d, mes)
  const eventos = eventosDelMes(d, mes)

  return {
    titulo: `Reporte mensual · ${etiquetaMes(mes, true)}`,
    subtitulo: `${eventos.length} movimientos`,
    resumen: [
      { label: 'Ingresos', valor: formatMoney(r.ingresos) },
      { label: 'Gastos fijos', valor: formatMoney(r.gastosFijos) },
      { label: 'Gastos variables', valor: formatMoney(r.gastosVariables) },
      { label: 'Cuotas', valor: formatMoney(r.cuotas) },
      { label: 'Servicios', valor: formatMoney(r.servicios) },
      { label: 'Saldo disponible', valor: formatMoney(r.disponible) },
    ],
    columnas: ['Fecha', 'Concepto', 'Tipo', 'Detalle', 'Importe'],
    filas: eventos.map((e) => [
      fechaLegible(e.fecha),
      e.titulo,
      ESTILO_TIPO[e.tipo].label,
      e.detalle ?? '',
      `${e.tipo === 'ingreso' ? '+' : ''}${formatMoney(e.importe)}`,
    ]),
  }
}

const FILAS_ANUAL = [
  { label: 'Ingresos', campo: 'ingresos' },
  { label: 'Gastos fijos', campo: 'gastosFijos' },
  { label: 'Gastos variables', campo: 'gastosVariables' },
  { label: 'Cuotas de tarjetas', campo: 'cuotasTarjeta' },
  { label: 'Cuotas de préstamos', campo: 'cuotasPrestamo' },
  { label: 'Servicios', campo: 'servicios' },
  { label: 'Total egresos', campo: 'egresos' },
  { label: 'Saldo del mes', campo: 'disponible' },
] as const

/** Reporte anual: matriz de 12 meses × conceptos. */
export function reporteAnual(d: DatosFinancieros, mesInicio: string): ReporteData {
  const meses = ventanaMeses(mesInicio, 12)
  const serie = serieMensual(d, meses)

  const totalDe = (campo: (typeof FILAS_ANUAL)[number]['campo']) =>
    serie.reduce((a, s) => a + s[campo], 0)

  return {
    titulo: `Proyección anual · desde ${etiquetaMes(mesInicio, true)}`,
    subtitulo: '12 meses',
    resumen: [
      { label: 'Total ingresos', valor: formatMoney(totalDe('ingresos')) },
      { label: 'Total egresos', valor: formatMoney(totalDe('egresos')) },
      { label: 'Saldo acumulado', valor: formatMoney(totalDe('disponible')) },
    ],
    columnas: ['Concepto', ...meses.map((m) => etiquetaMes(m)), 'Total'],
    filas: FILAS_ANUAL.map((fila) => [
      fila.label,
      ...serie.map((s) => formatMoney(s[fila.campo])),
      formatMoney(totalDe(fila.campo)),
    ]),
  }
}
