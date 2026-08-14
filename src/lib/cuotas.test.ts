import { describe, it, expect } from 'vitest'
import {
  cuotasDeCompra,
  cuotasDePrestamo,
  generarCuotas,
  mesFinalizacion,
  cuotaEnMes,
  nroCuotaEnMes,
  cuotasRestantes,
  totalPendiente,
  proximoVencimiento,
  estaActivaEnMes,
  resumenCompra,
  resumenPrestamo,
  cuotasEfectivas,
  importeCuotaPrestamoEnMes,
  estadoPlan,
  importeCompraEnMes,
} from './cuotas'

describe('motor de cuotas', () => {
  // Ejemplo del spec: compra de TV en 12 cuotas de $50.000 desde julio
  const compraTV = {
    fechaCompra: '2026-07-15',
    cantidadCuotas: 12,
    importePorCuota: 5_000_000, // $50.000 en centavos
  }

  it('genera exactamente N cuotas', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(cuotas).toHaveLength(12)
  })

  it('distribuye las cuotas en meses consecutivos desde el mes de compra', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(cuotas[0]).toEqual({ mes: '2026-07', nroCuota: 1, importe: 5_000_000 })
    expect(cuotas[1].mes).toBe('2026-08')
    expect(cuotas[2].mes).toBe('2026-09')
  })

  it('cruza el fin de año correctamente', () => {
    const cuotas = cuotasDeCompra(compraTV)
    // cuota 6 = diciembre 2026, cuota 7 = enero 2027
    expect(cuotas[5].mes).toBe('2026-12')
    expect(cuotas[6].mes).toBe('2027-01')
    // última cuota (12) = junio 2027
    expect(cuotas[11].mes).toBe('2027-06')
  })

  it('calcula el mes de finalización', () => {
    expect(mesFinalizacion('2026-07', 12)).toBe('2027-06')
    expect(mesFinalizacion('2026-07', 1)).toBe('2026-07')
    expect(mesFinalizacion('2026-07', 0)).toBeNull()
  })

  it('encuentra la cuota que cae en un mes', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(cuotaEnMes(cuotas, '2026-09')?.nroCuota).toBe(3)
    expect(cuotaEnMes(cuotas, '2027-06')?.nroCuota).toBe(12)
  })

  it('las cuotas desaparecen de meses fuera del rango', () => {
    const cuotas = cuotasDeCompra(compraTV)
    // antes de la compra
    expect(cuotaEnMes(cuotas, '2026-06')).toBeNull()
    expect(estaActivaEnMes(cuotas, '2026-06')).toBe(false)
    // después de terminar
    expect(cuotaEnMes(cuotas, '2027-07')).toBeNull()
    expect(estaActivaEnMes(cuotas, '2027-07')).toBe(false)
  })

  it('calcula número de cuota vigente en un mes de referencia', () => {
    expect(nroCuotaEnMes('2026-07', 12, '2026-06')).toBe(0) // aún no arranca
    expect(nroCuotaEnMes('2026-07', 12, '2026-07')).toBe(1)
    expect(nroCuotaEnMes('2026-07', 12, '2026-10')).toBe(4)
    expect(nroCuotaEnMes('2026-07', 12, '2027-06')).toBe(12)
    expect(nroCuotaEnMes('2026-07', 12, '2027-08')).toBe(12) // ya terminó
  })

  it('cuenta cuotas restantes desde un mes', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(cuotasRestantes(cuotas, '2026-07')).toBe(12)
    expect(cuotasRestantes(cuotas, '2027-01')).toBe(6)
    expect(cuotasRestantes(cuotas, '2027-07')).toBe(0)
  })

  it('suma el total pendiente desde un mes', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(totalPendiente(cuotas, '2026-07')).toBe(60_000_000) // 12 * 50.000
    expect(totalPendiente(cuotas, '2027-01')).toBe(30_000_000) // 6 * 50.000
    expect(totalPendiente(cuotas, '2027-07')).toBe(0)
  })

  it('encuentra el próximo vencimiento', () => {
    const cuotas = cuotasDeCompra(compraTV)
    expect(proximoVencimiento(cuotas, '2026-05')).toBe('2026-07')
    expect(proximoVencimiento(cuotas, '2026-09')).toBe('2026-09')
    expect(proximoVencimiento(cuotas, '2026-09-30'.slice(0, 7))).toBe('2026-09')
    expect(proximoVencimiento(cuotas, '2027-07')).toBeNull()
  })

  it('funciona con préstamos igual que con compras', () => {
    const prestamo = {
      fecha: '2026-08-01',
      cantidadCuotas: 36,
      valorCuota: 15_000_000, // $150.000
    }
    const cuotas = cuotasDePrestamo(prestamo)
    expect(cuotas).toHaveLength(36)
    expect(cuotas[0].mes).toBe('2026-08')
    expect(cuotas[35].mes).toBe('2029-07')
    expect(totalPendiente(cuotas, '2026-08')).toBe(540_000_000)
  })

  it('generarCuotas maneja casos borde', () => {
    expect(generarCuotas('2026-07', 0, 100)).toHaveLength(0)
    expect(generarCuotas('2026-07', 1, 100)).toEqual([
      { mes: '2026-07', nroCuota: 1, importe: 100 },
    ])
  })

  it('resumen de compra a mitad de camino', () => {
    // compra TV en 12 desde julio 2026, visto en octubre 2026 (cuota 4)
    const r = resumenCompra(compraTV, '2026-10')
    expect(r.cuotaActual).toBe(4)
    expect(r.cuotasRestantes).toBe(9) // oct..jun = 9
    expect(r.totalOriginal).toBe(60_000_000)
    expect(r.totalPendiente).toBe(45_000_000) // 9 * 50.000
    expect(r.proximoVencimiento).toBe('2026-10')
    expect(r.mesFin).toBe('2027-06')
    expect(r.activa).toBe(true)
  })

  it('resumen de compra ya terminada', () => {
    const r = resumenCompra(compraTV, '2027-08')
    expect(r.cuotaActual).toBe(12)
    expect(r.cuotasRestantes).toBe(0)
    expect(r.totalPendiente).toBe(0)
    expect(r.proximoVencimiento).toBeNull()
    expect(r.activa).toBe(false)
  })

  it('estado del plan: próxima / en curso / finalizada', () => {
    // TV en 12 desde julio 2026
    expect(estadoPlan('2026-07', 12, '2026-05')).toBe('proxima') // antes de empezar
    expect(estadoPlan('2026-07', 12, '2026-07')).toBe('encurso') // primera cuota
    expect(estadoPlan('2026-07', 12, '2027-06')).toBe('encurso') // última cuota
    expect(estadoPlan('2026-07', 12, '2027-07')).toBe('finalizada') // pasada
  })

  it('una compra futura sigue pendiente (no aparece como finalizada)', () => {
    const futura = { fechaCompra: '2026-09-05', cantidadCuotas: 12, importePorCuota: 1_000_000 }
    const r = resumenCompra(futura, '2026-08') // visto un mes antes de empezar
    expect(r.estado).toBe('proxima')
    expect(r.pendiente).toBe(true)
    expect(r.activa).toBe(false) // no factura este mes, pero no está terminada
  })

  it('mesPrimerResumen ubica la compra en el resumen posterior al cierre', () => {
    // Compra post-cierre: su 1ª cuota vive en el resumen de agosto, no de julio.
    const compra = {
      fechaCompra: '2026-07-27',
      mesPrimerResumen: '2026-08',
      cantidadCuotas: 3,
      importePorCuota: 3_000_000,
    }
    expect(importeCompraEnMes(compra, '2026-07')).toBe(0)
    expect(importeCompraEnMes(compra, '2026-08')).toBe(3_000_000)
    expect(resumenCompra(compra, '2026-08').cuotaActual).toBe(1)
  })

  it('un pago anticipado se factura en su mes (además de conservar el total)', () => {
    // TV 12×$50.000 desde jul-2026. En oct adelantamos las últimas 3 cuotas.
    const compra = {
      fechaCompra: '2026-07-15',
      cantidadCuotas: 12,
      importePorCuota: 5_000_000,
      cuotasAdelantadas: 3, // se acortan 3 del final (quedan 9)
      adelantos: [{ mes: '2026-10', importe: 15_000_000 }], // 3 × 50.000 pagadas en oct
    }
    // Oct: cuota normal (50.000) + adelanto (150.000) = 200.000
    expect(importeCompraEnMes(compra, '2026-10')).toBe(20_000_000)
    // El plan ahora termina antes: mar-2027 (jul + 8) ya no factura cuota normal…
    expect(importeCompraEnMes(compra, '2027-04')).toBe(0)
  })

  it('resumen de préstamo', () => {
    const prestamo = { fecha: '2026-08-10', cantidadCuotas: 36, valorCuota: 15_000_000 }
    const r = resumenPrestamo(prestamo, '2026-08')
    expect(r.cuotaActual).toBe(1)
    expect(r.cuotasRestantes).toBe(36)
    expect(r.totalPendiente).toBe(540_000_000)
    expect(r.mesFin).toBe('2029-07')
  })

  it('cuotas adelantadas acortan el plan por el final', () => {
    const compra = { ...compraTV, cuotasAdelantadas: 2 }
    expect(cuotasEfectivas(compra)).toBe(10)
    const r = resumenCompra(compra, '2026-07')
    expect(r.cantidadCuotas).toBe(10)
    expect(r.mesFin).toBe('2027-04') // jul 2026 + 9 meses (en vez de jun 2027)
    expect(r.totalPendiente).toBe(50_000_000) // 10 * 50.000
  })

  it('préstamo UVA: la cuota crece el % de ajuste por mes', () => {
    const uva = {
      fecha: '2026-07-05',
      cantidadCuotas: 12,
      valorCuota: 10_000_00, // $10.000 cuota actual
      tipoAjuste: 'uva' as const,
      ajusteMensualPct: 5,
      mesReferenciaAjuste: '2026-07',
    }
    expect(importeCuotaPrestamoEnMes(uva, '2026-07')).toBe(10_000_00)
    expect(importeCuotaPrestamoEnMes(uva, '2026-08')).toBe(10_500_00) // +5%
    expect(importeCuotaPrestamoEnMes(uva, '2026-09')).toBe(11_025_00) // +5% compuesto
    expect(importeCuotaPrestamoEnMes(uva, '2027-08')).toBe(0) // ya terminó
    // el total pendiente suma las cuotas crecientes (mayor que 12 * cuota fija)
    const r = resumenPrestamo(uva, '2026-07')
    expect(r.totalPendiente).toBeGreaterThan(120_000_00)
  })
})
