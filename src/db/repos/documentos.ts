import { db } from '../db'
import type { Documento } from '@/models'

export const documentosRepo = {
  /** Adjuntos de una entidad (por tipo + id). */
  deEntidad: (entidadTipo: string, entidadId: number) =>
    db.documentos
      .where('entidadId')
      .equals(entidadId)
      .filter((d) => d.entidadTipo === entidadTipo)
      .toArray(),

  agregar: (doc: Omit<Documento, 'id'>) => db.documentos.add(doc as Documento),
  eliminar: (id: number) => db.documentos.delete(id),

  /** Borra todos los adjuntos de una entidad (para limpieza en cascada). */
  eliminarDeEntidad: (entidadTipo: string, entidadId: number) =>
    db.documentos
      .where('entidadId')
      .equals(entidadId)
      .filter((d) => d.entidadTipo === entidadTipo)
      .delete(),
}
