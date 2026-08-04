import { db } from '../db'
import { documentosRepo } from './documentos'
import type { Tarjeta, CompraTarjeta } from '@/models'

export const tarjetasRepo = {
  todas: () => db.tarjetas.orderBy('nombre').toArray(),
  agregar: (t: Omit<Tarjeta, 'id'>) => db.tarjetas.add(t as Tarjeta),
  actualizar: (id: number, cambios: Partial<Tarjeta>) => db.tarjetas.update(id, cambios),
  /** Elimina la tarjeta, todas sus compras y los adjuntos de esas compras. */
  eliminar: (id: number) =>
    db.transaction('rw', db.tarjetas, db.comprasTarjeta, db.documentos, async () => {
      const compras = await db.comprasTarjeta.where('tarjetaId').equals(id).toArray()
      for (const c of compras) {
        if (c.id != null)
          await db.documentos.where('entidadId').equals(c.id).filter((d) => d.entidadTipo === 'compra').delete()
      }
      await db.comprasTarjeta.where('tarjetaId').equals(id).delete()
      await db.tarjetas.delete(id)
    }),
}

export const comprasRepo = {
  todas: () => db.comprasTarjeta.toArray(),
  deTarjeta: (tarjetaId: number) =>
    db.comprasTarjeta.where('tarjetaId').equals(tarjetaId).toArray(),
  agregar: (c: Omit<CompraTarjeta, 'id'>) => db.comprasTarjeta.add(c as CompraTarjeta),
  actualizar: (id: number, cambios: Partial<CompraTarjeta>) =>
    db.comprasTarjeta.update(id, cambios),
  eliminar: async (id: number) => {
    await documentosRepo.eliminarDeEntidad('compra', id)
    await db.comprasTarjeta.delete(id)
  },
}
