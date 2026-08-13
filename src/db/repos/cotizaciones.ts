import { db } from '../db'
import type { Cotizacion } from '@/models'

export const cotizacionesRepo = {
  /** Guarda (o pisa) la cotización de un día. */
  guardar: (c: Cotizacion) => db.cotizaciones.put(c),
  /** Cotización cacheada de una fecha 'YYYY-MM-DD', o undefined. */
  deFecha: (fecha: string) => db.cotizaciones.get(fecha),
  /** Última cotización conocida (la de fecha más reciente), o null. */
  ultima: async (): Promise<Cotizacion | null> => {
    const todas = await db.cotizaciones.toArray()
    if (todas.length === 0) return null
    return todas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0]
  },
}
