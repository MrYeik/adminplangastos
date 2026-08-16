import { describe, it, expect } from 'vitest'
import { importeVigenteEnMes } from './vigencia'

describe('importe vigente por mes', () => {
  it('sin cambios devuelve el importe base', () => {
    expect(importeVigenteEnMes(10000, undefined, '2026-09')).toBe(10000)
    expect(importeVigenteEnMes(10000, [], '2026-09')).toBe(10000)
  })

  it('un cambio rige desde su mes en adelante, sin tocar el pasado', () => {
    const cambios = [{ desde: '2026-09', importe: 12000 }]
    expect(importeVigenteEnMes(10000, cambios, '2026-08')).toBe(10000) // antes del cambio
    expect(importeVigenteEnMes(10000, cambios, '2026-09')).toBe(12000) // desde el cambio
    expect(importeVigenteEnMes(10000, cambios, '2026-12')).toBe(12000) // sigue rigiendo
  })

  it('toma el último cambio aplicable cuando hay varios', () => {
    const cambios = [
      { desde: '2026-09', importe: 12000 },
      { desde: '2027-01', importe: 15000 },
    ]
    expect(importeVigenteEnMes(10000, cambios, '2026-08')).toBe(10000)
    expect(importeVigenteEnMes(10000, cambios, '2026-12')).toBe(12000)
    expect(importeVigenteEnMes(10000, cambios, '2027-03')).toBe(15000)
  })
})
