import { db } from '../db'
import { documentosRepo } from './documentos'
import type { Ingreso } from '@/models'

export const ingresosRepo = {
  todos: () => db.ingresos.orderBy('fecha').reverse().toArray(),
  agregar: (i: Omit<Ingreso, 'id'>) => db.ingresos.add(i as Ingreso),
  actualizar: (id: number, cambios: Partial<Ingreso>) => db.ingresos.update(id, cambios),
  eliminar: async (id: number) => {
    await documentosRepo.eliminarDeEntidad('ingreso', id)
    await db.ingresos.delete(id)
  },
}
