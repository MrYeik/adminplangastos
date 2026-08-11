// Helpers genéricos para el control de pagos por mes.
// Cualquier entidad con `mesesPagados?: string[]` (gastos, tarjetas, servicios).

export function estaPagado(mesesPagados: string[] | undefined, mes: string): boolean {
  return (mesesPagados ?? []).includes(mes)
}

/** Devuelve la nueva lista de meses pagados con `mes` alternado. */
export function togglePagoMes(mesesPagados: string[] | undefined, mes: string): string[] {
  const set = new Set(mesesPagados ?? [])
  if (set.has(mes)) set.delete(mes)
  else set.add(mes)
  return [...set]
}
