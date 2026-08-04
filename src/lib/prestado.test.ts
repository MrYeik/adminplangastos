import { describe, it, expect } from 'vitest'
import { totalPagado, saldoPrestado, estadoDerivado } from './prestado'

describe('dinero prestado entre personas', () => {
  const base = { importe: 10_000_000 } // $100.000

  it('sin pagos: pendiente y saldo completo', () => {
    const p = { ...base, pagos: [] }
    expect(totalPagado(p)).toBe(0)
    expect(saldoPrestado(p)).toBe(10_000_000)
    expect(estadoDerivado(p)).toBe('pendiente')
  })

  it('pago parcial: estado parcial y saldo restante', () => {
    const p = { ...base, pagos: [{ fecha: '2026-07-10', importe: 3_000_000 }] }
    expect(totalPagado(p)).toBe(3_000_000)
    expect(saldoPrestado(p)).toBe(7_000_000)
    expect(estadoDerivado(p)).toBe('parcial')
  })

  it('pagos que cubren el total: cancelado y saldo 0', () => {
    const p = {
      ...base,
      pagos: [
        { fecha: '2026-07-10', importe: 4_000_000 },
        { fecha: '2026-08-10', importe: 6_000_000 },
      ],
    }
    expect(saldoPrestado(p)).toBe(0)
    expect(estadoDerivado(p)).toBe('cancelado')
  })

  it('sobrepago no genera saldo negativo', () => {
    const p = { ...base, pagos: [{ fecha: '2026-07-10', importe: 12_000_000 }] }
    expect(saldoPrestado(p)).toBe(0)
    expect(estadoDerivado(p)).toBe('cancelado')
  })

  it('maneja pagos indefinidos', () => {
    expect(saldoPrestado({ importe: 5_000_000 })).toBe(5_000_000)
    expect(estadoDerivado({ importe: 5_000_000 })).toBe('pendiente')
  })
})
