import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { DatosFinancieros } from '@/lib/agregados'
import type { Ingreso, Gasto, CompraTarjeta, Prestamo, Servicio, Tarjeta } from '@/models'

const VACIO: DatosFinancieros = {
  ingresos: [],
  gastos: [],
  compras: [],
  prestamos: [],
  servicios: [],
  tarjetas: [],
}

/** Carga reactiva de todos los datos financieros (ingresos, gastos, cuotas, servicios). */
export function useDatosFinancieros(): DatosFinancieros {
  const ingresos = useLiveQuery(() => db.ingresos.toArray(), [], [] as Ingreso[])
  const gastos = useLiveQuery(() => db.gastos.toArray(), [], [] as Gasto[])
  const compras = useLiveQuery(() => db.comprasTarjeta.toArray(), [], [] as CompraTarjeta[])
  const prestamos = useLiveQuery(() => db.prestamos.toArray(), [], [] as Prestamo[])
  const servicios = useLiveQuery(() => db.servicios.toArray(), [], [] as Servicio[])
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), [], [] as Tarjeta[])

  if (!ingresos || !gastos || !compras || !prestamos || !servicios || !tarjetas) return VACIO
  return { ingresos, gastos, compras, prestamos, servicios, tarjetas }
}
