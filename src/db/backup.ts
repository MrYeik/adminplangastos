import { db } from './db'
import type {
  Ingreso,
  Gasto,
  Tarjeta,
  CompraTarjeta,
  Prestamo,
  Prestado,
  Presupuesto,
  Configuracion,
  Servicio,
} from '@/models'

export interface BackupData {
  app: 'gastos'
  version: number
  fecha: string
  ingresos: Ingreso[]
  gastos: Gasto[]
  tarjetas: Tarjeta[]
  comprasTarjeta: CompraTarjeta[]
  prestamos: Prestamo[]
  prestados: Prestado[]
  presupuestos: Presupuesto[]
  configuracion: Configuracion[]
  servicios?: Servicio[] // agregado en v2 (opcional para compatibilidad)
}

/** Genera el objeto de backup con todos los datos (excepto adjuntos). */
export async function generarBackup(): Promise<BackupData> {
  const [
    ingresos,
    gastos,
    tarjetas,
    comprasTarjeta,
    prestamos,
    prestados,
    presupuestos,
    configuracion,
    servicios,
  ] = await Promise.all([
    db.ingresos.toArray(),
    db.gastos.toArray(),
    db.tarjetas.toArray(),
    db.comprasTarjeta.toArray(),
    db.prestamos.toArray(),
    db.prestados.toArray(),
    db.presupuestos.toArray(),
    db.configuracion.toArray(),
    db.servicios.toArray(),
  ])

  return {
    app: 'gastos',
    version: 2,
    fecha: new Date().toISOString(),
    ingresos,
    gastos,
    tarjetas,
    comprasTarjeta,
    prestamos,
    prestados,
    presupuestos,
    configuracion,
    servicios,
  }
}

/** Descarga el backup como archivo JSON. */
export async function descargarBackup(): Promise<void> {
  const data = await generarBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastos-backup-${data.fecha.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Valida que un objeto parseado tenga forma de backup de esta app. */
export function esBackupValido(data: unknown): data is BackupData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as BackupData).app === 'gastos' &&
    Array.isArray((data as BackupData).ingresos) &&
    Array.isArray((data as BackupData).gastos)
  )
}

/**
 * Restaura un backup: reemplaza TODOS los datos actuales por los del archivo.
 * Operación destructiva.
 */
export async function restaurarBackup(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.ingresos,
      db.gastos,
      db.tarjetas,
      db.comprasTarjeta,
      db.prestamos,
      db.prestados,
      db.presupuestos,
      db.configuracion,
      db.servicios,
    ],
    async () => {
      await Promise.all([
        db.ingresos.clear(),
        db.gastos.clear(),
        db.tarjetas.clear(),
        db.comprasTarjeta.clear(),
        db.prestamos.clear(),
        db.prestados.clear(),
        db.presupuestos.clear(),
        db.configuracion.clear(),
        db.servicios.clear(),
      ])
      await Promise.all([
        db.ingresos.bulkAdd(data.ingresos),
        db.gastos.bulkAdd(data.gastos),
        db.tarjetas.bulkAdd(data.tarjetas),
        db.comprasTarjeta.bulkAdd(data.comprasTarjeta),
        db.prestamos.bulkAdd(data.prestamos),
        db.prestados.bulkAdd(data.prestados),
        db.presupuestos.bulkAdd(data.presupuestos),
        db.configuracion.bulkAdd(data.configuracion),
        db.servicios.bulkAdd(data.servicios ?? []),
      ])
    },
  )
}

/** Borra todos los datos (deja la configuración por defecto en la próxima carga). */
export async function borrarTodo(): Promise<void> {
  await Promise.all([
    db.ingresos.clear(),
    db.gastos.clear(),
    db.tarjetas.clear(),
    db.comprasTarjeta.clear(),
    db.prestamos.clear(),
    db.prestados.clear(),
    db.presupuestos.clear(),
    db.documentos.clear(),
    db.servicios.clear(),
  ])
}
