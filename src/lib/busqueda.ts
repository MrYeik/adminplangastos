// Búsqueda unificada sobre todas las entidades: ingresos, gastos, compras de
// tarjeta, préstamos y dinero prestado. Busca por texto en los campos relevantes.

import type { Ingreso, Gasto, CompraTarjeta, Prestamo, Prestado, Tarjeta, Servicio } from '@/models'
import { importeActual } from './servicios'

export type TipoResultado = 'ingreso' | 'gasto' | 'tarjeta' | 'prestamo' | 'prestado' | 'servicio'

export interface ResultadoBusqueda {
  tipo: TipoResultado
  id: number
  titulo: string
  subtitulo: string
  fecha: string
  importe: number
  campos: string[] // valores donde se busca (normalizados aparte)
}

export interface FuentesBusqueda {
  ingresos: Ingreso[]
  gastos: Gasto[]
  compras: CompraTarjeta[]
  prestamos: Prestamo[]
  prestados: Prestado[]
  tarjetas: Tarjeta[]
  servicios: Servicio[]
}

/** Normaliza texto: minúsculas y sin acentos, para comparar. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function arma(
  tipo: TipoResultado,
  id: number,
  titulo: string,
  subtitulo: string,
  fecha: string,
  importe: number,
  extra: (string | undefined)[] = [],
): ResultadoBusqueda {
  const campos = [titulo, subtitulo, ...extra].filter(Boolean) as string[]
  return { tipo, id, titulo, subtitulo, fecha, importe, campos }
}

/** Convierte todas las entidades en resultados uniformes. */
export function indexar(f: FuentesBusqueda): ResultadoBusqueda[] {
  const tarjetaNombre = new Map(f.tarjetas.map((t) => [t.id!, t.nombre]))
  const res: ResultadoBusqueda[] = []

  for (const i of f.ingresos) {
    res.push(arma('ingreso', i.id!, i.descripcion, i.categoria, i.fecha, i.importe, [i.observaciones]))
  }
  for (const g of f.gastos) {
    res.push(
      arma('gasto', g.id!, g.descripcion, g.categoria, g.fecha, g.importe, [
        g.medioPago,
        g.responsable,
        g.observaciones,
      ]),
    )
  }
  for (const c of f.compras) {
    const tj = tarjetaNombre.get(c.tarjetaId) ?? ''
    res.push(
      arma('tarjeta', c.id!, c.descripcion, [tj, c.comercio].filter(Boolean).join(' · '), c.fechaCompra, c.importePorCuota, [
        tj,
        c.comercio,
        c.observaciones,
      ]),
    )
  }
  for (const p of f.prestamos) {
    res.push(arma('prestamo', p.id!, p.entidad, 'Préstamo', p.fecha, p.valorCuota, [p.observaciones]))
  }
  for (const p of f.prestados) {
    res.push(arma('prestado', p.id!, p.persona, p.concepto, p.fecha, p.importe, [p.concepto]))
  }
  for (const s of f.servicios) {
    const tj = s.tarjetaId != null ? tarjetaNombre.get(s.tarjetaId) ?? '' : ''
    const desde = [...s.importes].sort((a, b) => (a.desde < b.desde ? -1 : 1))[0]?.desde ?? ''
    res.push(
      arma(
        'servicio',
        s.id!,
        s.descripcion,
        [s.categoria, tj || s.medioPago].filter(Boolean).join(' · '),
        desde ? `${desde}-01` : '',
        importeActual(s),
        [s.categoria, tj, s.medioPago, s.observaciones],
      ),
    )
  }

  return res
}

export interface FiltrosBusqueda {
  texto?: string
  tipo?: TipoResultado | 'todos'
  desde?: string // 'YYYY-MM-DD'
  hasta?: string
}

/** Busca en todas las entidades según texto y filtros. */
export function buscar(f: FuentesBusqueda, filtros: FiltrosBusqueda): ResultadoBusqueda[] {
  const q = normalizar(filtros.texto ?? '')
  const palabras = q.split(/\s+/).filter(Boolean)

  return indexar(f)
    .filter((r) => {
      if (filtros.tipo && filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false
      if (filtros.desde && r.fecha < filtros.desde) return false
      if (filtros.hasta && r.fecha > filtros.hasta) return false
      if (palabras.length > 0) {
        const heno = normalizar(r.campos.join(' '))
        if (!palabras.every((p) => heno.includes(p))) return false
      }
      return true
    })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
}
