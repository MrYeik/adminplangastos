import { db } from '../db'
import type { Prestado } from '@/models'

export const prestadosRepo = {
  todos: () => db.prestados.orderBy('fecha').reverse().toArray(),
  agregar: (p: Omit<Prestado, 'id'>) => db.prestados.add(p as Prestado),
  actualizar: (id: number, cambios: Partial<Prestado>) => db.prestados.update(id, cambios),
  eliminar: (id: number) => db.prestados.delete(id),
}
