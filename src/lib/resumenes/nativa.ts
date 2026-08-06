// Parser del resumen de Visa Banco Nación (Nativa / Visa Platinum).
// Formato: fecha con puntos (DD.MM.YY), columnas PESOS y DÓLAR, cuotas "C.NN/NN".

import {
  type BancoParser,
  type LineaPDF,
  type Consumo,
  type PlanConsumo,
  RE_MONTO_PLANO,
  aCentavos,
  textoPlano,
} from './tipos'

function encontrarHeaderIdx(lineas: LineaPDF[]): number {
  return lineas.findIndex((l) => {
    const t = l.texto.toUpperCase()
    return t.includes('FECHA') && t.includes('COMPROBANTE') && t.includes('DETALLE')
  })
}

const RE_FIN = /^(saldo actual|pago m[ií]nimo|plan v|debitaremos|programa de lealtad)/i
const RE_PAGO = /^(su pago|pago )/i

function parseLinea(linea: LineaPDF): Consumo | null {
  const m = linea.texto.match(/^(\d{2})\.(\d{2})\.(\d{2})\s+(.*)$/)
  if (!m) return null
  const [, dd, mm, yy, resto0] = m

  // Las dos últimas cifras de la línea son las columnas PESOS y DÓLAR.
  const montos = linea.items.filter((it) => RE_MONTO_PLANO.test(it.str)).sort((a, b) => a.x - b.x)
  if (montos.length < 2) return null
  const pesoItem = montos[montos.length - 2]
  const dolarItem = montos[montos.length - 1]
  const pesos = aCentavos(pesoItem.str)
  const dolar = aCentavos(dolarItem.str)

  if (pesos < 0) return null // pagos / créditos
  const moneda: 'ARS' | 'USD' = pesos !== 0 ? 'ARS' : 'USD'
  const importe = pesos !== 0 ? pesos : dolar
  if (importe === 0) return null

  // Detalle: desde después de la fecha hasta el importe en pesos.
  let mid = resto0
  const idx = mid.lastIndexOf(pesoItem.str)
  if (idx >= 0) mid = mid.slice(0, idx).trim()
  // Saca el número de comprobante inicial (4+ dígitos).
  mid = mid.replace(/^\d{4,}\s+/, '')
  if (RE_PAGO.test(mid)) return null

  // Cuota "C.NN/NN".
  let cuotaActual: number | null = null
  let cuotaTotal: number | null = null
  let plan: PlanConsumo = 'unico'
  const cm = mid.match(/\bC\.(\d{2})\/(\d{2})\b/)
  if (cm) {
    cuotaActual = Number(cm[1])
    cuotaTotal = Number(cm[2])
    plan = cuotaTotal > 1 ? 'cuotas' : 'unico'
    mid = (mid.slice(0, cm.index) + mid.slice(cm.index! + cm[0].length)).replace(/\s+/g, ' ').trim()
  }

  return {
    fecha: `20${yy}-${mm}-${dd}`,
    subtarjeta: '',
    detalle: mid.trim(),
    cuotaActual,
    cuotaTotal,
    plan,
    importe,
    moneda,
  }
}

export const nativa: BancoParser = {
  nombre: 'Visa Banco Nación',

  detectar(lineas) {
    const t = textoPlano(lineas)
    return t.includes('detalle de transaccion') || t.includes('detalle de transacción')
  },

  parse(lineas) {
    const idx = encontrarHeaderIdx(lineas)
    if (idx < 0) return []
    const consumos: Consumo[] = []
    for (let i = idx + 1; i < lineas.length; i++) {
      if (RE_FIN.test(lineas[i].texto)) break
      const c = parseLinea(lineas[i])
      if (c) consumos.push(c)
    }
    return consumos
  },
}
