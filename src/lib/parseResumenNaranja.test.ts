import { describe, it, expect } from 'vitest'
import {
  parseResumenNaranja,
  esResumenNaranja,
  type LineaPDF,
  type CeldaTexto,
} from './parseResumenNaranja'

function mk(pagina: number, cells: [number, string][]): LineaPDF {
  const items: CeldaTexto[] = cells.map(([x, str]) => ({ x, str }))
  const texto = [...items]
    .sort((a, b) => a.x - b.x)
    .map((i) => i.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { pagina, texto, items }
}

// Construye una línea de consumo con las columnas en x estándar.
function consumo(
  fecha: string,
  tarjeta: string | null,
  cupon: string,
  detalle: string,
  plan: string | null,
  monto: string,
  dolar = false,
): LineaPDF {
  const cells: [number, string][] = [[10, fecha]]
  if (tarjeta) {
    cells.push([60, tarjeta], [110, cupon])
  }
  cells.push([160, detalle])
  if (plan) cells.push([300, plan])
  cells.push([dolar ? 520 : 450, monto])
  return mk(2, cells)
}

const HEADER = mk(2, [
  [10, 'FECHA'],
  [60, 'TARJETA'],
  [110, 'CUPON'],
  [160, 'DETALLE'],
  [300, 'CUOTA/PLAN'],
  [450, '$'],
  [520, 'U$S'],
])

const lineas: LineaPDF[] = [
  mk(2, [[10, 'Detalle de Consumos tarjeta de credito de Christian']]),
  HEADER,
  consumo('01/06/26', 'Naranja X', '1140', 'MERPAGO*LAANONIMA', '03/06', '60.286,92'),
  consumo('26/06/26', 'Naranja X', '2634', 'LA ANONIMA SUCURSAL 72', 'Zeta', '81.633,08'),
  consumo('05/07/26', 'Naranja X', '3050', 'LA ANONIMA SUCURSAL 43', 'Zeta', '45.123,11'),
  consumo('08/07/26', 'Naranja X', '6178', 'LA ANONIMA SUCURSAL 72', 'Zeta', '30.182,26'),
  consumo('09/07/26', 'Naranja X', '4807', 'LA ANONIMA SUCURSAL 43', 'Zeta', '22.800,00'),
  consumo('09/07/26', 'Naranja X', '6213', 'LA ANONIMA SUCURSAL 72', 'Zeta', '78.969,84'),
  consumo('26/06/26', 'NX Visa', '1', 'LACAJASEGURO 028032571 -0', 'Deb.Aut.', '132.534,00'),
  consumo('14/07/26', 'NX Visa', '412030', 'CAJA SEGUROS-VIDA028032576 -0', 'Deb.Aut.', '9.343,00'),
  consumo('16/07/26', 'NX Visa', '2329', 'IVA RG 4240 21% SERV. DIGITAL', '01', '1.427,79'),
  consumo('16/07/26', 'NX Visa', '3299', 'PERCEPCION RG 5617 ARCA (6.799,00)', '01', '2.039,70'),
  consumo('27/06/26', 'NX Visa', '749737', 'GOOGLE *YOUTUBEP P1MKUNBZ', 'Deb.Aut.', '4,66', true),
  consumo('27/07/26', null, '', '*PLAN EPICO(REMPLAZA COSTO DE MANTENIMIENTO)', null, '10.495,86'),
  mk(2, [[10, 'Otros'], [60, 'cargos:']]),
  // Página 3: "Cancelación anticipada" — NO debe importarse.
  consumo('01/06/26', 'Naranja X', '1140', 'MERPAGO*LAANONIMA - cuota 02', null, '60.286,92'),
]
// forzar la última a página 3
lineas[lineas.length - 1].pagina = 3

describe('parser resumen Naranja', () => {
  it('reconoce el resumen', () => {
    expect(esResumenNaranja(lineas)).toBe(true)
    expect(esResumenNaranja([mk(1, [[0, 'otro banco cualquiera']])])).toBe(false)
  })

  it('extrae solo los consumos de la sección (no cancelación anticipada)', () => {
    const c = parseResumenNaranja(lineas)
    expect(c).toHaveLength(12) // 11 del detalle + Plan Épico; excluye Otros y página 3
  })

  it('detecta compras en cuotas', () => {
    const c = parseResumenNaranja(lineas)
    const merpago = c.find((x) => x.detalle === 'MERPAGO*LAANONIMA')
    expect(merpago).toMatchObject({
      plan: 'cuotas',
      cuotaActual: 3,
      cuotaTotal: 6,
      importe: 6_028_692,
      moneda: 'ARS',
      subtarjeta: 'Naranja X',
      fecha: '2026-06-01',
    })
  })

  it('detecta planes Zeta y débitos automáticos', () => {
    const c = parseResumenNaranja(lineas)
    expect(c.filter((x) => x.plan === 'zeta')).toHaveLength(5)
    const seguro = c.find((x) => x.detalle.startsWith('LACAJASEGURO'))
    expect(seguro?.plan).toBe('debito')
    expect(seguro?.importe).toBe(13_253_400)
  })

  it('trata "01" como pago único y conserva paréntesis informativos', () => {
    const c = parseResumenNaranja(lineas)
    const perc = c.find((x) => x.detalle.startsWith('PERCEPCION'))
    expect(perc).toMatchObject({ plan: 'unico', importe: 203_970 })
    expect(perc?.detalle).toContain('(6.799,00)')
  })

  it('marca los consumos en dólares', () => {
    const c = parseResumenNaranja(lineas)
    const yt = c.find((x) => x.detalle.includes('YOUTUBE'))
    expect(yt?.moneda).toBe('USD')
    expect(yt?.importe).toBe(466)
  })

  it('la suma de consumos en pesos reconcilia con el total del resumen', () => {
    const c = parseResumenNaranja(lineas)
    const totalArs = c.filter((x) => x.moneda === 'ARS').reduce((a, x) => a + x.importe, 0)
    expect(totalArs).toBe(47_483_556) // $474.835,56
  })
})
