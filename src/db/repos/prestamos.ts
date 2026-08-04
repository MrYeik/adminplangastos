import { db } from '../db'
import { documentosRepo } from './documentos'
import type { Prestamo } from '@/models'

export const prestamosRepo = {
  todos: () => db.prestamos.orderBy('fecha').reverse().toArray(),
  agregar: (p: Omit<Prestamo, 'id'>) => db.prestamos.add(p as Prestamo),
  actualizar: (id: number, cambios: Partial<Prestamo>) => db.prestamos.update(id, cambios),
  eliminar: async (id: number) => {
    await documentosRepo.eliminarDeEntidad('prestamo', id)
    await db.prestamos.delete(id)
  },
}
