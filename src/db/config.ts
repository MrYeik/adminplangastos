import { db } from './db'
import { mesActual } from '@/lib/dates'
import type { Configuracion } from '@/models'

export const CONFIG_POR_DEFECTO: Omit<Configuracion, 'id'> = {
  mesInicioProyeccion: mesActual(),
  moneda: 'ARS',
  simboloMoneda: '$',
  categorias: [
    'Vivienda',
    'Servicios',
    'Alimentación',
    'Transporte',
    'Salud',
    'Educación',
    'Seguros',
    'Entretenimiento',
    'Impuestos',
    'Otros',
  ],
  bancos: ['Nación', 'Galicia', 'Santander', 'BBVA', 'Naranja X'],
  personas: [],
  mediosPago: ['Efectivo', 'Débito', 'Transferencia', 'Tarjeta de crédito'],
  notificacionDias: [10, 5, 2, 1],
}

/** Devuelve la configuración; si no existe, la crea con los valores por defecto. */
export async function obtenerConfig(): Promise<Configuracion> {
  const existente = await db.configuracion.toCollection().first()
  if (existente) return existente
  const id = await db.configuracion.add(CONFIG_POR_DEFECTO as Configuracion)
  return { ...CONFIG_POR_DEFECTO, id }
}

export async function guardarConfig(cambios: Partial<Configuracion>): Promise<void> {
  const actual = await obtenerConfig()
  await db.configuracion.update(actual.id!, cambios)
}
