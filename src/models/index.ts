// Tipos de dominio. Todos los importes se guardan en CENTAVOS (enteros).
// Todas las fechas se guardan como ISO 'YYYY-MM-DD'.

export type ID = number

export type CategoriaGasto =
  | 'Vivienda'
  | 'Servicios'
  | 'Alimentación'
  | 'Transporte'
  | 'Salud'
  | 'Educación'
  | 'Seguros'
  | 'Entretenimiento'
  | 'Impuestos'
  | 'Otros'

export type TipoGasto = 'fijo' | 'variable'

export interface Ingreso {
  id?: ID
  descripcion: string
  categoria: string
  fecha: string
  importe: number // centavos
  repeticionMensual: boolean
  observaciones?: string
}

export interface Gasto {
  id?: ID
  descripcion: string
  categoria: CategoriaGasto | string
  fecha: string
  importe: number // centavos
  medioPago?: string
  responsable?: string
  observaciones?: string
  repetitivoMensual: boolean
  tipo: TipoGasto
  esServicio?: boolean // se refleja en la pestaña Servicios (sin duplicar valor)
}

export interface Tarjeta {
  id?: ID
  nombre: string
  banco?: string
  color: string
}

export interface CompraTarjeta {
  id?: ID
  tarjetaId: ID
  descripcion: string
  fechaCompra: string
  comercio?: string
  cantidadCuotas: number
  cuotaActual: number // cuántas cuotas ya transcurrieron al momento de cargar
  importePorCuota: number // centavos
  observaciones?: string
  cuotasAdelantadas?: number // cuotas pagadas por adelantado (acortan el plan por el final)
  esServicio?: boolean // se refleja en la pestaña Servicios (sin duplicar valor)
}

/** Un importe vigente a partir de un mes (para el historial de aumentos). */
export interface ImporteVigente {
  desde: string // 'YYYY-MM' — este importe rige desde este mes en adelante
  importe: number // centavos
}

/**
 * Servicio con débito recurrente (ej. streaming, seguro, gimnasio).
 * Se repite todos los meses hasta la baja. Puede estar adherido a una tarjeta
 * (débito automático) y tener aumentos: `importes` guarda el historial y en
 * cada mes rige el último importe cuyo `desde` es <= ese mes.
 */
export interface Servicio {
  id?: ID
  descripcion: string
  categoria: string
  tarjetaId?: ID // adherido a una tarjeta (débito automático); si no, medio de pago
  medioPago?: string
  diaVencimiento: number // 1-31
  hasta?: string // 'YYYY-MM' mes de baja; sin valor = activo
  importes: ImporteVigente[] // historial de importes, ordenado por `desde`
  observaciones?: string
}

export type TipoAjustePrestamo = 'fijo' | 'uva'

export interface Prestamo {
  id?: ID
  entidad: string
  fecha: string
  capital: number // centavos
  cantidadCuotas: number
  valorCuota: number // centavos (la cuota "actual" en pesos)
  cuotaActual: number
  observaciones?: string
  // Ajuste UVA: la cuota crece `ajusteMensualPct` % por mes desde el mes de
  // referencia (mesReferenciaAjuste). Si es 'fijo' o vacío, la cuota no varía.
  tipoAjuste?: TipoAjustePrestamo
  ajusteMensualPct?: number
  mesReferenciaAjuste?: string // 'YYYY-MM' donde valorCuota es el importe conocido
}

export type EstadoPrestado = 'pendiente' | 'parcial' | 'cancelado'

export interface PagoParcial {
  fecha: string
  importe: number // centavos
}

export interface Prestado {
  id?: ID
  persona: string
  concepto: string
  importe: number // centavos
  fecha: string
  estado: EstadoPrestado
  pagos?: PagoParcial[]
}

export interface Presupuesto {
  id?: ID
  categoria: string
  mes: string // 'YYYY-MM'
  montoEstimado: number // centavos
}

export interface Documento {
  id?: ID
  entidadTipo: string
  entidadId: ID
  nombre: string
  mime: string
  blob: Blob
}

export interface Configuracion {
  id?: ID
  mesInicioProyeccion: string // 'YYYY-MM'
  moneda: string
  simboloMoneda: string
  categorias: string[]
  bancos: string[]
  personas: string[]
  mediosPago: string[]
  notificacionDias: number[]
}
