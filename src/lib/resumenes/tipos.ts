// Tipos y helpers compartidos por los parsers de resúmenes de tarjeta.

export interface CeldaTexto {
  x: number
  str: string
}

export interface LineaPDF {
  pagina: number
  texto: string
  items: CeldaTexto[]
}

export type PlanConsumo = 'cuotas' | 'zeta' | 'debito' | 'unico'

export interface Consumo {
  fecha: string // ISO 'YYYY-MM-DD'
  subtarjeta: string // ej. 'Naranja X', 'NX Visa', '' si no aplica
  detalle: string
  cuotaActual: number | null
  cuotaTotal: number | null
  plan: PlanConsumo
  importe: number // centavos
  moneda: 'ARS' | 'USD'
}

/** Un parser específico de un banco/emisor. */
export interface BancoParser {
  /** Nombre legible del emisor. */
  nombre: string
  /** ¿Estas líneas corresponden a este resumen? */
  detectar(lineas: LineaPDF[]): boolean
  /** Extrae los consumos del resumen. */
  parse(lineas: LineaPDF[]): Consumo[]
}

export const RE_MONTO_PLANO = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/

/** Convierte "1.234,56" (o "-1.234,56") a centavos enteros. */
export function aCentavos(s: string): number {
  return Math.round(parseFloat(s.replace(/\./g, '').replace(',', '.')) * 100)
}

/** Texto plano de todas las líneas, en minúsculas (para detección). */
export function textoPlano(lineas: LineaPDF[]): string {
  return lineas
    .map((l) => l.texto)
    .join(' ')
    .toLowerCase()
}
