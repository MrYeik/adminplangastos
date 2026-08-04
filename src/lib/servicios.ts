// Lógica de servicios con débito recurrente y aumentos.
// El importe vigente en un mes es el del último aumento cuyo `desde` <= mes.

import type { Servicio, ImporteVigente } from '@/models'

/** Devuelve los importes ordenados por `desde` ascendente. */
export function importesOrdenados(s: Pick<Servicio, 'importes'>): ImporteVigente[] {
  return [...s.importes].sort((a, b) => (a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0))
}

/** Mes de alta del servicio (el `desde` más antiguo). */
export function mesAlta(s: Pick<Servicio, 'importes'>): string | null {
  const ord = importesOrdenados(s)
  return ord.length ? ord[0].desde : null
}

/** ¿El servicio está activo (facturando) en un mes dado? */
export function servicioActivoEnMes(s: Servicio, mes: string): boolean {
  const alta = mesAlta(s)
  if (!alta || mes < alta) return false
  if (s.hasta && mes > s.hasta) return false
  return true
}

/** Importe vigente del servicio en un mes (0 si no está activo ese mes). */
export function importeServicioEnMes(s: Servicio, mes: string): number {
  if (!servicioActivoEnMes(s, mes)) return 0
  let vigente = 0
  for (const iv of importesOrdenados(s)) {
    if (iv.desde <= mes) vigente = iv.importe
    else break
  }
  return vigente
}

/** Importe vigente "hoy" (el del último aumento registrado). */
export function importeActual(s: Servicio): number {
  const ord = importesOrdenados(s)
  return ord.length ? ord[ord.length - 1].importe : 0
}

/** Suma de todos los servicios activos en un mes. */
export function serviciosDelMes(servicios: Servicio[], mes: string): number {
  return servicios.reduce((acc, s) => acc + importeServicioEnMes(s, mes), 0)
}

/** Suma de los servicios adheridos a una tarjeta, en un mes. */
export function serviciosDeTarjetaEnMes(
  servicios: Servicio[],
  tarjetaId: number,
  mes: string,
): number {
  return servicios
    .filter((s) => s.tarjetaId === tarjetaId)
    .reduce((acc, s) => acc + importeServicioEnMes(s, mes), 0)
}
