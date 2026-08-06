import { describe, it, expect } from 'vitest'
import { nativa } from './nativa'
import { detectarResumen } from './index'
import type { LineaPDF, CeldaTexto } from './tipos'

function nc(pagina: number, cells: [number, string][]): LineaPDF {
  const items: CeldaTexto[] = cells.map(([x, str]) => ({ x, str }))
  const texto = [...items]
    .sort((a, b) => a.x - b.x)
    .map((i) => i.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { pagina, texto, items }
}

const lineas: LineaPDF[] = [
  nc(1, [[10, 'JAQUE CHRISTIAN VISA PLATINUM']]),
  nc(1, [
    [10, 'FECHA'],
    [60, 'COMPROBANTE'],
    [130, 'DETALLE DE TRANSACCION'],
    [400, 'PESOS'],
    [470, 'DOLAR'],
  ]),
  nc(1, [[10, '02.07.26'], [100, 'SU PAGO EN PESOS'], [400, '-165.243,76'], [470, '0,00']]),
  nc(1, [[10, '29.05.26'], [60, '599832'], [100, 'HIPERTEHUELCHE RIO GAI C.02/03'], [400, '13.143,13'], [470, '0,00']]),
  nc(1, [[10, '01.07.26'], [60, '024506'], [100, 'Spotify'], [400, '4.399,00'], [470, '0,00']]),
  nc(1, [[10, '02.07.26'], [60, '564764'], [100, 'META GL000016020095 07/26'], [400, '59.990,00'], [470, '0,00']]),
  nc(1, [[10, '03.07.26'], [60, '000001'], [100, 'MOVISTAR HOGAR 000000582527886'], [400, '20.999,70'], [470, '0,00']]),
  nc(1, [[10, 'TARJETA'], [60, '5909'], [100, 'Total Consumos de CHRISTIAN ALE JAQUE'], [400, '98.531,83'], [470, '0,00']]),
  // el "4399,00" entre paréntesis (columna detalle) no debe tomarse como importe
  nc(1, [[10, '23.07.26'], [100, 'IVA RG 4240 21%('], [150, '4399,00'], [200, ')'], [400, '923,79'], [470, '0,00']]),
  nc(1, [[10, '23.07.26'], [100, 'DB.RG 5617 30% ('], [150, '4399,00'], [200, ')'], [400, '1.319,70'], [470, '0,00']]),
  nc(1, [[10, 'SALDO ACTUAL'], [400, '100.775,32'], [470, '0,00']]),
]

describe('parser Nativa (Visa Nación)', () => {
  it('detecta el resumen y lo enruta al parser correcto', () => {
    expect(nativa.detectar(lineas)).toBe(true)
    expect(detectarResumen(lineas)?.banco).toBe('Visa Banco Nación')
  })

  it('extrae los consumos, salteando pago y subtotal', () => {
    const c = nativa.parse(lineas)
    expect(c).toHaveLength(6) // 4 comercios + IVA + DB (sin pago ni subtotal)
    expect(c.some((x) => /pago/i.test(x.detalle))).toBe(false)
  })

  it('detecta cuotas con formato C.NN/NN', () => {
    const c = nativa.parse(lineas)
    const hiper = c.find((x) => x.detalle.startsWith('HIPERTEHUELCHE'))
    expect(hiper).toMatchObject({
      plan: 'cuotas',
      cuotaActual: 2,
      cuotaTotal: 3,
      importe: 1_314_313,
      fecha: '2026-05-29',
    })
  })

  it('no confunde "07/26" con una cuota', () => {
    const meta = nativa.parse(lineas).find((x) => x.detalle.startsWith('META'))
    expect(meta?.plan).toBe('unico')
    expect(meta?.detalle).toContain('07/26')
    expect(meta?.importe).toBe(5_999_000)
  })

  it('ignora el importe base entre paréntesis y toma el de la columna PESOS', () => {
    const iva = nativa.parse(lineas).find((x) => x.detalle.startsWith('IVA'))
    expect(iva?.importe).toBe(92_379) // $923,79, no $4.399
  })

  it('reconcilia con Total Consumos y con Saldo Actual', () => {
    const c = nativa.parse(lineas)
    const comercios = c.filter((x) => !/^iva|^db\.rg/i.test(x.detalle))
    expect(comercios.reduce((a, x) => a + x.importe, 0)).toBe(9_853_183) // $98.531,83
    const totalArs = c.filter((x) => x.moneda === 'ARS').reduce((a, x) => a + x.importe, 0)
    expect(totalArs).toBe(10_077_532) // $100.775,32 (Saldo Actual)
  })
})
