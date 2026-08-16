import type { ImporteVigente } from '@/models'

/**
 * Importe vigente en un mes dado. `base` es el importe original (rige desde el
 * alta del ítem); `importes` son cambios posteriores {desde, importe} que pisan
 * el valor a partir de su mes, sin modificar los meses anteriores. Sirve para
 * ingresos/gastos repetitivos que aumentan o bajan a futuro.
 */
export function importeVigenteEnMes(
  base: number,
  importes: ImporteVigente[] | undefined,
  mes: string,
): number {
  if (!importes || importes.length === 0) return base
  let val = base
  for (const it of [...importes].sort((a, b) => (a.desde < b.desde ? -1 : 1))) {
    if (it.desde <= mes) val = it.importe
  }
  return val
}
