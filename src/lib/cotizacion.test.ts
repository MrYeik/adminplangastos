import { describe, it, expect } from 'vitest'
import { convertirUsdAArs } from './cotizacion'

describe('conversión USD → ARS', () => {
  // Cotización en centavos ARS por USD: $1.490,00 = 149000 centavos.
  const cotiz = 149000

  it('convierte centavos de USD a centavos de ARS', () => {
    // 100 USD = 10000 centavos-USD → 100 × 1490 = $149.000 = 14.900.000 centavos-ARS
    expect(convertirUsdAArs(10000, cotiz)).toBe(14_900_000)
  })

  it('redondea al centavo', () => {
    // 1,01 USD (101 centavos) × 1490 = $1.504,90 → 150490 centavos
    expect(convertirUsdAArs(101, cotiz)).toBe(150_490)
  })

  it('cero da cero', () => {
    expect(convertirUsdAArs(0, cotiz)).toBe(0)
  })
})
