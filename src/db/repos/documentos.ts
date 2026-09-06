import { db } from '../db'
import type { Documento } from '@/models'

export const documentosRepo = {
  /**
   * Adjuntos de una entidad (por tipo + id). Si se pasa `mes`, devuelve solo los
   * de ese mes (ej. recibos de sueldo); si no, solo los sin mes (comportamiento
   * histórico para entidades no mensuales).
   */
  deEntidad: (entidadTipo: string, entidadId: number, mes?: string) =>
    db.documentos
      .where('entidadId')
      .equals(entidadId)
      .filter((d) => d.entidadTipo === entidadTipo && (mes ? d.mes === mes : d.mes == null))
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
