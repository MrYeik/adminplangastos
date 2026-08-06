// Registro de parsers de resúmenes de tarjeta. Para sumar un banco nuevo,
// creá su parser y agregalo a PARSERS.

import type { BancoParser, LineaPDF, Consumo } from './tipos'
import { naranja } from './naranja'
import { nativa } from './nativa'

export * from './tipos'

export const PARSERS: BancoParser[] = [naranja, nativa]

export interface ResumenDetectado {
  banco: string
  consumos: Consumo[]
}

/** Detecta el emisor del resumen y devuelve sus consumos, o null si no lo reconoce. */
export function detectarResumen(lineas: LineaPDF[]): ResumenDetectado | null {
  for (const parser of PARSERS) {
    if (parser.detectar(lineas)) {
      return { banco: parser.nombre, consumos: parser.parse(lineas) }
    }
  }
  return null
}
