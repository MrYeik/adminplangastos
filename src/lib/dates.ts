// Utilidades de fechas y meses. Un "mes" se representa como 'YYYY-MM'.

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** 'YYYY-MM' del mes actual. */
export function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Fecha de hoy en ISO local 'YYYY-MM-DD' (sin corrimiento por zona horaria). */
export function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Formatea 'YYYY-MM-DD' como 'DD/MM/YYYY' para mostrar. */
export function fechaLegible(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-')
  return `${d}/${m}/${y}`
}

/** Día del mes (1-31) de una fecha ISO. */
export function diaDeFecha(fechaISO: string): number {
  return Number(fechaISO.slice(8, 10))
}

/** Cantidad de días de un mes 'YYYY-MM'. */
export function diasDelMes(mes: string): number {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Índice del primer día del mes en semana que arranca lunes (0=lunes..6=domingo). */
export function primerDiaSemana(mes: string): number {
  const [y, m] = mes.split('-').map(Number)
  return (new Date(y, m - 1, 1).getDay() + 6) % 7
}

/** Construye 'YYYY-MM-DD' con un día dado, acotado a la longitud del mes. */
export function fechaConDia(mes: string, dia: number): string {
  const dd = Math.min(Math.max(1, dia), diasDelMes(mes))
  return `${mes}-${String(dd).padStart(2, '0')}`
}

/** Suma (o resta) días a una fecha ISO 'YYYY-MM-DD'. */
export function sumarDiasISO(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d + dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`
}

/**
 * Período del resumen de una tarjeta que cierra en `mes`. Con día de cierre,
 * va del día siguiente al cierre anterior hasta el cierre de este mes.
 * Sin día de cierre, es el mes calendario.
 */
export function periodoResumen(
  mes: string,
  diaCierre?: number,
): { desde: string; hasta: string; cierre: string } {
  if (!diaCierre) {
    const ult = fechaConDia(mes, diasDelMes(mes))
    return { desde: fechaConDia(mes, 1), hasta: ult, cierre: ult }
  }
  const cierre = fechaConDia(mes, diaCierre)
  const cierreAnterior = fechaConDia(sumarMeses(mes, -1), diaCierre)
  return { desde: sumarDiasISO(cierreAnterior, 1), hasta: cierre, cierre }
}

/** Días de diferencia entre dos fechas ISO (b - a), sin corrimiento horario. */
export function diasEntreISO(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad).getTime()
  const db = new Date(by, bm - 1, bd).getTime()
  return Math.round((db - da) / 86_400_000)
}

/** Extrae 'YYYY-MM' de una fecha ISO 'YYYY-MM-DD'. */
export function mesDeFecha(fechaISO: string): string {
  return fechaISO.slice(0, 7)
}

/** Suma (o resta) meses a un 'YYYY-MM'. */
export function sumarMeses(mes: string, cantidad: number): string {
  const [y, m] = mes.split('-').map(Number)
  const total = y * 12 + (m - 1) + cantidad
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

/** Diferencia en meses entre dos 'YYYY-MM' (b - a). */
export function diffMeses(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by * 12 + bm) - (ay * 12 + am)
}

/** Genera una ventana de N meses a partir de un mes inicial. */
export function ventanaMeses(mesInicio: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarMeses(mesInicio, i))
}

/** Etiqueta legible: '2026-07' -> 'Jul 2026'. */
export function etiquetaMes(mes: string, largo = false): string {
  const [y, m] = mes.split('-').map(Number)
  const nombre = MESES_ES[m - 1]
  return largo ? `${nombre} ${y}` : `${nombre.slice(0, 3)} ${y}`
}

export { MESES_ES }
