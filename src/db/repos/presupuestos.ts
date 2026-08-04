import { db } from '../db'
import type { Presupuesto } from '@/models'

export const presupuestosRepo = {
  todos: () => db.presupuestos.toArray(),
  delMes: (mes: string) => db.presupuestos.where('mes').equals(mes).toArray(),

  /** Crea o actualiza el monto estimado de una categoría en un mes. */
  async upsert(categoria: string, mes: string, montoEstimado: number): Promise<void> {
    const existentes = await db.presupuestos.where('mes').equals(mes).toArray()
    const existente = existentes.find((p) => p.categoria === categoria)
    if (existente) {
      if (montoEstimado <= 0) await db.presupuestos.delete(existente.id!)
      else await db.presupuestos.update(existente.id!, { montoEstimado })
    } else if (montoEstimado > 0) {
      await db.presupuestos.add({ categoria, mes, montoEstimado } as Presupuesto)
    }
  },

  /** Copia todos los presupuestos de un mes a otro (sin pisar los existentes). */
  async copiarMes(desde: string, hacia: string): Promise<void> {
    const origen = await db.presupuestos.where('mes').equals(desde).toArray()
    const destino = await db.presupuestos.where('mes').equals(hacia).toArray()
    const yaHay = new Set(destino.map((p) => p.categoria))
    for (const p of origen) {
      if (!yaHay.has(p.categoria)) {
        await db.presupuestos.add({
          categoria: p.categoria,
          mes: hacia,
          montoEstimado: p.montoEstimado,
        } as Presupuesto)
      }
    }
  },
}
