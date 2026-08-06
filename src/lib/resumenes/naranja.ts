// Parser del resumen de Tarjeta Naranja (Naranja X).

import {
  type BancoParser,
  type LineaPDF,
  type Consumo,
  type PlanConsumo,
  RE_MONTO_PLANO,
  aCentavos,
  textoPlano,
} from './tipos'

function encontrarHeader(lineas: LineaPDF[]): { idx: number; dolarColX: number } | null {
  for (let i = 0; i < lineas.length; i++) {
    const t = lineas[i].texto.toUpperCase()
    if (t.includes('FECHA') && t.includes('DETALLE') && t.includes('CUOTA')) {
      const u = lineas[i].items.find((it) => it.str.toUpperCase().includes('U$S'))
      return { idx: i, dolarColX: u ? u.x : Number.POSITIVE_INFINITY }
    }
  }
  return null
}

const RE_FIN = /^(otros|total|impuesto de sellos|iva operaciones|para que|pago del|cancelaci)/i

function parseLinea(linea: LineaPDF, dolarColX: number): Consumo | null {
  const m = linea.texto.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(.*)$/)
  if (!m) return null
  const [, dd, mm, yy, resto0] = m

  const montoItems = linea.items
    .filter((it) => RE_MONTO_PLANO.test(it.str))
    .sort((a, b) => a.x - b.x)
  if (montoItems.length === 0) return null

  const margen = 5
  const pesos = montoItems.filter((it) => it.x < dolarColX - margen)
  const dolares = montoItems.filter((it) => it.x >= dolarColX - margen)
  const item = pesos.length ? pesos[pesos.length - 1] : dolares[dolares.length - 1]
  const moneda: 'ARS' | 'USD' = pesos.length ? 'ARS' : 'USD'
  const importe = aCentavos(item.str)

  let mid = resto0
  const idx = mid.lastIndexOf(item.str)
  if (idx >= 0) mid = mid.slice(0, idx).trim()

  let subtarjeta = ''
  const mt = mid.match(/^(Naranja X|NX Visa|NX Master(?:card)?|NX Amex)\s+(\S+)\s+(.*)$/)
  if (mt) {
    subtarjeta = mt[1]
    mid = mt[3]
  }

  let cuotaActual: number | null = null
  let cuotaTotal: number | null = null
  let plan: PlanConsumo = 'unico'
  let cm: RegExpMatchArray | null
  if ((cm = mid.match(/\s(\d{2})\/(\d{2})$/))) {
    cuotaActual = Number(cm[1])
    cuotaTotal = Number(cm[2])
    plan = cuotaTotal > 1 ? 'cuotas' : 'unico'
    mid = mid.slice(0, cm.index).trim()
  } else if (/\sZeta$/i.test(mid)) {
    plan = 'zeta'
    mid = mid.replace(/\sZeta$/i, '').trim()
  } else if (/\sDeb\.?\s?Aut\.?$/i.test(mid)) {
    plan = 'debito'
    mid = mid.replace(/\sDeb\.?\s?Aut\.?$/i, '').trim()
  } else if ((cm = mid.match(/\s(\d{1,2})$/))) {
    cuotaTotal = Number(cm[1])
    cuotaActual = 1
    if (cuotaTotal > 1) plan = 'cuotas'
    mid = mid.slice(0, cm.index).trim()
  }

  return {
    fecha: `20${yy}-${mm}-${dd}`,
    subtarjeta,
    detalle: mid.trim(),
    cuotaActual,
    cuotaTotal,
    plan,
    importe,
    moneda,
  }
}

export const naranja: BancoParser = {
  nombre: 'Tarjeta Naranja',

  detectar(lineas) {
    const t = textoPlano(lineas)
    return t.includes('naranja') && t.includes('detalle de consumos')
  },

  parse(lineas) {
    const header = encontrarHeader(lineas)
    if (!header) return []
    const consumos: Consumo[] = []
    for (let i = header.idx + 1; i < lineas.length; i++) {
      const linea = lineas[i]
      if (linea.pagina !== lineas[header.idx].pagina) break
      if (RE_FIN.test(linea.texto)) break
      const c = parseLinea(linea, header.dolarColX)
      if (c) consumos.push(c)
    }
    return consumos
  },
}
