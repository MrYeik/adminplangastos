import Dexie, { type Table } from 'dexie'
import type {
  Ingreso,
  Gasto,
  Tarjeta,
  CompraTarjeta,
  Prestamo,
  Prestado,
  Presupuesto,
  Documento,
  Configuracion,
  Servicio,
  Cotizacion,
} from '@/models'

export class GastosDB extends Dexie {
  ingresos!: Table<Ingreso, number>
  gastos!: Table<Gasto, number>
  tarjetas!: Table<Tarjeta, number>
  comprasTarjeta!: Table<CompraTarjeta, number>
  prestamos!: Table<Prestamo, number>
  prestados!: Table<Prestado, number>
  presupuestos!: Table<Presupuesto, number>
  documentos!: Table<Documento, number>
  configuracion!: Table<Configuracion, number>
  servicios!: Table<Servicio, number>
  cotizaciones!: Table<Cotizacion, string>

  constructor() {
    super('gastos-db')
    this.version(1).stores({
      ingresos: '++id, categoria, fecha, repeticionMensual',
      gastos: '++id, categoria, fecha, tipo, repetitivoMensual, responsable',
      tarjetas: '++id, nombre',
      comprasTarjeta: '++id, tarjetaId, fechaCompra',
      prestamos: '++id, entidad, fecha',
      prestados: '++id, persona, estado, fecha',
      presupuestos: '++id, categoria, mes',
      documentos: '++id, entidadTipo, entidadId',
      configuracion: '++id',
    })
    // v2: servicios con débito recurrente (adheribles a tarjeta) y aumentos.
    this.version(2).stores({
      servicios: '++id, tarjetaId, categoria',
    })
    // v3: cache de cotizaciones del dólar oficial (BNA), una por día.
    this.version(3).stores({
      cotizaciones: 'fecha',
    })
  }
}

export const db = new GastosDB()
