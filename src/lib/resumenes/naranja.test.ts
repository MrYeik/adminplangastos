import { describe, it, expect } from 'vitest'
import { naranja } from './naranja'
import { detectarResumen } from './index'
import type { LineaPDF, CeldaTexto } from './tipos'

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
  if (tarjeta) cells.push([60, tarjeta], [110, cupon])
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
  consumo('01/06/26', 'Naranja X', '1140', 'MERPAGO*LAANONIMA - cuota 02', null, '60.286,92'),
]
lineas[lineas.length - 1].pagina = 3

describe('parser Naranja', () => {
  it('detecta el resumen por el registro', () => {
    expect(naranja.detectar(lineas)).toBe(true)
    expect(detectarResumen(lineas)?.banco).toBe('Tarjeta Naranja')
  })

  it('extrae los consumos de la sección (sin cancelación anticipada)', () => {
    expect(naranja.parse(lineas)).toHaveLength(12)
  })

  it('cuotas, Zeta, débito y dólares', () => {
    const c = naranja.parse(lineas)
    expect(c.find((x) => x.detalle === 'MERPAGO*LAANONIMA')).toMatchObject({
      plan: 'cuotas',
      cuotaActual: 3,
      cuotaTotal: 6,
      importe: 6_028_692,
      fecha: '2026-06-01',
    })
    expect(c.filter((x) => x.plan === 'zeta')).toHaveLength(5)
    expect(c.find((x) => x.detalle.includes('YOUTUBE'))?.moneda).toBe('USD')
    expect(c.find((x) => x.detalle.startsWith('PERCEPCION'))?.detalle).toContain('(6.799,00)')
  })

  it('la suma en pesos reconcilia con el total del resumen', () => {
    const c = naranja.parse(lineas)
    const totalArs = c.filter((x) => x.moneda === 'ARS').reduce((a, x) => a + x.importe, 0)
    expect(totalArs).toBe(47_483_556) // $474.835,56
  })
})
