import { describe, it, expect } from 'vitest'
import {
  importeServicioEnMes,
  servicioActivoEnMes,
  serviciosDelMes,
  serviciosDeTarjetaEnMes,
  importeActual,
  mesAlta,
} from './servicios'
import type { Servicio } from '@/models'

const netflix: Servicio = {
  id: 1,
  descripcion: 'Netflix',
  categoria: 'Entretenimiento',
  tarjetaId: 5,
  diaVencimiento: 10,
  importes: [
    { desde: '2026-01', importe: 5_000_00 },
    { desde: '2026-07', importe: 6_500_00 }, // aumento en julio
  ],
}

describe('servicios con aumentos', () => {
  it('usa el importe vigente según el mes', () => {
    expect(importeServicioEnMes(netflix, '2026-03')).toBe(5_000_00) // antes del aumento
    expect(importeServicioEnMes(netflix, '2026-06')).toBe(5_000_00) // último mes con precio viejo
    expect(importeServicioEnMes(netflix, '2026-07')).toBe(6_500_00) // desde el aumento
    expect(importeServicioEnMes(netflix, '2027-01')).toBe(6_500_00) // sigue vigente
  })

  it('no factura antes del alta', () => {
    expect(servicioActivoEnMes(netflix, '2025-12')).toBe(false)
    expect(importeServicioEnMes(netflix, '2025-12')).toBe(0)
    expect(mesAlta(netflix)).toBe('2026-01')
  })

  it('respeta la baja (hasta)', () => {
    const dadoDeBaja: Servicio = { ...netflix, hasta: '2026-09' }
    expect(importeServicioEnMes(dadoDeBaja, '2026-09')).toBe(6_500_00) // último mes
    expect(servicioActivoEnMes(dadoDeBaja, '2026-10')).toBe(false)
    expect(importeServicioEnMes(dadoDeBaja, '2026-10')).toBe(0)
  })

  it('importe actual = último aumento', () => {
    expect(importeActual(netflix)).toBe(6_500_00)
  })

  it('suma servicios del mes y por tarjeta', () => {
    const spotify: Servicio = {
      id: 2,
      descripcion: 'Spotify',
      categoria: 'Entretenimiento',
      tarjetaId: 5,
      diaVencimiento: 15,
      importes: [{ desde: '2026-01', importe: 2_000_00 }],
    }
    const seguro: Servicio = {
      id: 3,
      descripcion: 'Seguro auto',
      categoria: 'Seguros',
      diaVencimiento: 5,
      importes: [{ desde: '2026-01', importe: 8_000_00 }],
    }
    const servicios = [netflix, spotify, seguro]
    // julio: netflix 6.500 + spotify 2.000 + seguro 8.000
    expect(serviciosDelMes(servicios, '2026-07')).toBe(16_500_00)
    // solo los de la tarjeta 5 (netflix + spotify)
    expect(serviciosDeTarjetaEnMes(servicios, 5, '2026-07')).toBe(8_500_00)
  })
})
