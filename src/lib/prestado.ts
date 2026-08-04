import type { Prestado, EstadoPrestado } from '@/models'

/** Total pagado (suma de pagos parciales). */
export function totalPagado(p: Pick<Prestado, 'pagos'>): number {
  return (p.pagos ?? []).reduce((acc, pago) => acc + pago.importe, 0)
}

/** Saldo pendiente = importe - pagado (nunca negativo). */
export function saldoPrestado(p: Pick<Prestado, 'importe' | 'pagos'>): number {
  return Math.max(0, p.importe - totalPagado(p))
}

/** Estado derivado de los pagos respecto del importe. */
export function estadoDerivado(p: Pick<Prestado, 'importe' | 'pagos'>): EstadoPrestado {
  const pagado = totalPagado(p)
  if (pagado <= 0) return 'pendiente'
  if (pagado >= p.importe) return 'cancelado'
  return 'parcial'
}
