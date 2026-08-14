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
  mesesPagados?: string[] // meses 'YYYY-MM' marcados como pagados
}

export interface Tarjeta {
  id?: ID
  nombre: string
  banco?: string
  color: string
  diaCierre?: number // día de cierre habitual (1-31). El resumen de un mes cierra ESE día del mes anterior.
  diaVencimiento?: number // día de vencimiento/pago habitual (1-31), dentro del mes del resumen.
  cierres?: Record<string, string> // override por resumen: mes de pago 'YYYY-MM' → fecha de cierre 'YYYY-MM-DD'
  vencimientos?: Record<string, string> // override por resumen: mes de pago 'YYYY-MM' → fecha de vencimiento 'YYYY-MM-DD'
  mesesPagados?: string[] // (obsoleto) meses cuyo resumen está pagado; ahora el pago es por compra
}

/** Una compra que fue absorbida por un plan de unificación. */
export interface CompraUnificada {
  descripcion: string
  importe: number // saldo pendiente que se unificó (centavos)
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
  adelantos?: { mes: string; importe: number }[] // pagos anticipados: se suman a ese mes de resumen
  moneda?: 'ARS' | 'USD' // moneda original de la compra (default ARS)
  importeOriginalUSD?: number // si moneda='USD': importe por cuota en centavos de USD
  cotizacion?: number // centavos ARS por USD usados para convertir (cotización del día)
  mesPrimerResumen?: string // 'YYYY-MM' resumen donde cae la 1ª cuota (según día de cierre)
  mesesPagados?: string[] // meses de resumen 'YYYY-MM' en que esta compra se pagó
  esServicio?: boolean // se refleja en la pestaña Servicios (sin duplicar valor)
  categoriaServicio?: string // categoría con la que se muestra en Servicios
  servicioRecurrente?: boolean // se repite todos los meses (como un servicio)
  unificaDe?: CompraUnificada[] // si es un plan, las compras que unificó
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
  alias?: string // alias/CBU para transferencia (si el medio de pago es transferencia)
  diaVencimiento: number // 1-31
  hasta?: string // 'YYYY-MM' mes de baja; sin valor = activo
  importes: ImporteVigente[] // historial de importes, ordenado por `desde`
  observaciones?: string
  mesesPagados?: string[] // meses 'YYYY-MM' ya pagados
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

/** Cotización del dólar oficial (BNA) de un día. Importes en centavos ARS por USD. */
export interface Cotizacion {
  fecha: string // 'YYYY-MM-DD'
  compra: number // centavos ARS por 1 USD
  venta: number
  promedio: number // (compra + venta) / 2
  fuente: string // ej. 'BNA (dolarapi)'
  obtenidoEn: string // ISO datetime en que se obtuvo
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
