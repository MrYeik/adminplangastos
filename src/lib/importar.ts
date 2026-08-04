// Importación de movimientos desde CSV/Excel: parseo flexible de fechas e
// importes, auto-mapeo de columnas y conversión a Ingresos/Gastos.

import type { Ingreso, Gasto, TipoGasto } from '@/models'
import { parseMoney } from './money'
import { normalizar } from './busqueda'
import { hoyISO } from './dates'

export type Destino = 'ingresos' | 'gastos'

/** Detecta el delimitador (coma o punto y coma) a partir de la primera línea. */
export function detectarDelimitador(texto: string): ',' | ';' {
  const linea = texto.split(/\r?\n/)[0] ?? ''
  const comas = (linea.match(/,/g) || []).length
  const puntoComa = (linea.match(/;/g) || []).length
  return puntoComa > comas ? ';' : ','
}

/**
 * Parser CSV propio (mantiene los valores como texto crudo, sin coerción de
 * tipos). Soporta campos entre comillas con comas/comillas escapadas.
 */
export function parseCSV(texto: string, delimitador?: string): string[][] {
  const sep = delimitador ?? detectarDelimitador(texto)
  const s = texto.replace(/\r\n?/g, '\n')
  const filas: string[][] = []
  let campo = ''
  let fila: string[] = []
  let enComillas = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (enComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          enComillas = false
        }
      } else {
        campo += c
      }
    } else if (c === '"') {
      enComillas = true
    } else if (c === sep) {
      fila.push(campo)
      campo = ''
    } else if (c === '\n') {
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else {
      campo += c
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }
  return filas
}

export type CampoDestino =
  | 'descripcion'
  | 'categoria'
  | 'fecha'
  | 'importe'
  | 'tipo'
  | 'medioPago'
  | 'responsable'
  | 'repetir'

/** Mapeo de campo → índice de columna en el archivo (-1 = sin asignar). */
export type Mapeo = Record<CampoDestino, number>

export const CAMPOS_POR_DESTINO: Record<Destino, CampoDestino[]> = {
  ingresos: ['descripcion', 'categoria', 'fecha', 'importe', 'repetir'],
  gastos: ['descripcion', 'categoria', 'fecha', 'importe', 'tipo', 'medioPago', 'responsable', 'repetir'],
}

export const ETIQUETA_CAMPO: Record<CampoDestino, string> = {
  descripcion: 'Descripción',
  categoria: 'Categoría',
  fecha: 'Fecha',
  importe: 'Importe',
  tipo: 'Tipo (fijo/variable)',
  medioPago: 'Medio de pago',
  responsable: 'Responsable',
  repetir: 'Mensual (sí/no)',
}

const SINONIMOS: Record<CampoDestino, string[]> = {
  descripcion: ['descripcion', 'detalle', 'concepto', 'nombre'],
  categoria: ['categoria', 'rubro'],
  fecha: ['fecha', 'date', 'dia'],
  importe: ['importe', 'monto', 'valor', 'total', 'amount', 'precio'],
  tipo: ['tipo'],
  medioPago: ['medio', 'pago', 'metodo', 'forma'],
  responsable: ['responsable', 'persona', 'quien'],
  repetir: ['mensual', 'repetir', 'recurrente', 'repetitivo', 'fijo'],
}

/** Detecta automáticamente el mapeo de columnas según los encabezados. */
export function autoMapear(headers: string[], destino: Destino): Mapeo {
  const norm = headers.map((h) => normalizar(h))
  const mapeo = {} as Mapeo
  for (const campo of CAMPOS_POR_DESTINO[destino]) {
    const idx = norm.findIndex((h) => SINONIMOS[campo].some((s) => h.includes(s)))
    mapeo[campo] = idx
  }
  // asegurar todas las claves
  for (const c of Object.keys(ETIQUETA_CAMPO) as CampoDestino[]) {
    if (mapeo[c] === undefined) mapeo[c] = -1
  }
  return mapeo
}

/** Parsea una fecha en formatos comunes a ISO 'YYYY-MM-DD', o null. */
export function parseFechaFlexible(valor: string): string | null {
  if (!valor) return null
  const v = String(valor).trim()
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${mo}-${d}`
  }
  return null
}

function parseBool(valor: string): boolean {
  const v = normalizar(String(valor ?? ''))
  return ['si', 'sí', 'true', 'x', '1', 'verdadero', 'mensual'].includes(v)
}

function parseTipo(valor: string): TipoGasto {
  return normalizar(String(valor ?? '')).includes('var') ? 'variable' : 'fijo'
}

export interface FilaProcesada {
  ok: boolean
  registro?: Ingreso | Gasto
  error?: string
  fila: number
}

function celda(fila: string[], idx: number): string {
  return idx >= 0 && idx < fila.length ? String(fila[idx] ?? '').trim() : ''
}

/** Convierte una fila (array de celdas) en un registro según el mapeo. */
export function filaARegistro(
  fila: string[],
  mapeo: Mapeo,
  destino: Destino,
  nroFila: number,
): FilaProcesada {
  const descripcion = celda(fila, mapeo.descripcion)
  const importe = parseMoney(celda(fila, mapeo.importe))

  if (!descripcion) return { ok: false, error: 'Falta descripción', fila: nroFila }
  if (importe <= 0) return { ok: false, error: 'Importe inválido', fila: nroFila }

  const fecha = parseFechaFlexible(celda(fila, mapeo.fecha)) ?? hoyISO()
  const categoria = celda(fila, mapeo.categoria) || 'Otros'
  const repetir = mapeo.repetir >= 0 ? parseBool(celda(fila, mapeo.repetir)) : false

  if (destino === 'ingresos') {
    const registro: Ingreso = {
      descripcion,
      categoria,
      fecha,
      importe,
      repeticionMensual: repetir,
    }
    return { ok: true, registro, fila: nroFila }
  }

  const registro: Gasto = {
    descripcion,
    categoria,
    fecha,
    importe,
    tipo: mapeo.tipo >= 0 ? parseTipo(celda(fila, mapeo.tipo)) : 'fijo',
    medioPago: celda(fila, mapeo.medioPago) || undefined,
    responsable: celda(fila, mapeo.responsable) || undefined,
    repetitivoMensual: repetir,
  }
  return { ok: true, registro, fila: nroFila }
}

/** Procesa todas las filas y separa válidas de errores. */
export function procesarFilas(filas: string[][], mapeo: Mapeo, destino: Destino): FilaProcesada[] {
  return filas.map((fila, i) => filaARegistro(fila, mapeo, destino, i + 2)) // +2: fila 1 = encabezado
}
