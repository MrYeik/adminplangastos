import { db } from '../db'
import { documentosRepo } from './documentos'
import type { Gasto } from '@/models'

export const gastosRepo = {
  todos: () => db.gastos.orderBy('fecha').reverse().toArray(),
  agregar: (g: Omit<Gasto, 'id'>) => db.gastos.add(g as Gasto),
  actualizar: (id: number, cambios: Partial<Gasto>) => db.gastos.update(id, cambios),
  eliminar: async (id: number) => {
    await documentosRepo.eliminarDeEntidad('gasto', id)
    await db.gastos.delete(id)
  },
}
