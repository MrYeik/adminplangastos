// Agrupa "lo pagado por mes" para el historial (secciones tipo Tarjetas finalizadas).

export interface ItemPagado {
  id: string | number
  descripcion: string
  detalle?: string
  importe: number
}

export interface GrupoMes {
  mes: string // 'YYYY-MM'
  items: ItemPagado[]
  total: number
}

/**
 * Agrupa por mes los pagos de una lista de entidades con `mesesPagados`.
 * Devuelve un grupo por mes (más reciente primero) con el detalle de cada ítem.
 */
export function agruparPagosPorMes<T>(
  items: T[],
  opts: {
    meses: (t: T) => string[] | undefined
    importeEnMes: (t: T, mes: string) => number
    descripcion: (t: T) => string
    id: (t: T, mes: string) => string | number
    detalle?: (t: T, mes: string) => string | undefined
  },
): GrupoMes[] {
  const map = new Map<string, ItemPagado[]>()
  for (const it of items) {
    for (const mes of opts.meses(it) ?? []) {
      const arr = map.get(mes) ?? []
      arr.push({
        id: opts.id(it, mes),
        descripcion: opts.descripcion(it),
        detalle: opts.detalle?.(it, mes),
        importe: opts.importeEnMes(it, mes),
      })
      map.set(mes, arr)
    }
  }
  return [...map.entries()]
    .map(([mes, items]) => ({ mes, items, total: items.reduce((a, x) => a + x.importe, 0) }))
    .sort((a, b) => (a.mes < b.mes ? 1 : -1))
}

/** Combina varios listados "por mes" en uno solo (sumando ítems del mismo mes). */
export function mergeGruposMes(...arrs: GrupoMes[][]): GrupoMes[] {
  const map = new Map<string, ItemPagado[]>()
  for (const arr of arrs) {
    for (const g of arr) {
      const cur = map.get(g.mes) ?? []
      cur.push(...g.items)
      map.set(g.mes, cur)
    }
  }
  return [...map.entries()]
    .map(([mes, items]) => ({ mes, items, total: items.reduce((a, x) => a + x.importe, 0) }))
    .sort((a, b) => (a.mes < b.mes ? 1 : -1))
}
