import { db } from '../db'
import { documentosRepo } from './documentos'
import type { Servicio } from '@/models'

export const serviciosRepo = {
  todos: () => db.servicios.toArray(),
  agregar: (s: Omit<Servicio, 'id'>) => db.servicios.add(s as Servicio),
  actualizar: (id: number, cambios: Partial<Servicio>) => db.servicios.update(id, cambios),
  eliminar: async (id: number) => {
    await documentosRepo.eliminarDeEntidad('servicio', id)
    await db.servicios.delete(id)
  },
}
