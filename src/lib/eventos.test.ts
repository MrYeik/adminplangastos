import { describe, it, expect } from 'vitest'
import { eventosDelMes, obligacionesProximas } from './eventos'
import type { DatosFinancieros } from './agregados'

const datos: DatosFinancieros = {
  ingresos: [
    { id: 1, descripcion: 'Sueldo', categoria: 'Sueldo', fecha: '2026-07-05', importe: 150_000_00, repeticionMensual: true },
  ],
  gastos: [
    { id: 1, descripcion: 'Luz', categoria: 'Servicios', fecha: '2026-07-12', importe: 8_000_00, repetitivoMensual: true, tipo: 'fijo' },
    { id: 2, descripcion: 'ABL', categoria: 'Impuestos', fecha: '2026-07-20', importe: 3_000_00, repetitivoMensual: true, tipo: 'fijo' },
  ],
  compras: [
    { id: 1, tarjetaId: 1, descripcion: 'TV', fechaCompra: '2026-07-15', cantidadCuotas: 12, cuotaActual: 1, importePorCuota: 5_000_00 },
  ],
  prestamos: [
    { id: 1, entidad: 'Banco', fecha: '2026-07-10', capital: 0, cantidadCuotas: 6, valorCuota: 10_000_00, cuotaActual: 1 },
  ],
}

describe('eventos financieros', () => {
  it('genera eventos del mes con su tipo y fecha', () => {
    const ev = eventosDelMes(datos, '2026-07')
    expect(ev).toHaveLength(5) // sueldo, luz, abl, tv, prestamo
    const sueldo = ev.find((e) => e.titulo === 'Sueldo')
    expect(sueldo).toMatchObject({ tipo: 'ingreso', fecha: '2026-07-05' })
    expect(ev.find((e) => e.titulo === 'Luz')?.tipo).toBe('servicio')
    expect(ev.find((e) => e.titulo === 'ABL')?.tipo).toBe('impuesto')
    expect(ev.find((e) => e.titulo === 'TV')).toMatchObject({ tipo: 'tarjeta', fecha: '2026-07-15' })
    expect(ev.find((e) => e.titulo === 'Banco')?.tipo).toBe('prestamo')
  })

  it('ordena los eventos por fecha', () => {
    const ev = eventosDelMes(datos, '2026-07')
    const fechas = ev.map((e) => e.fecha)
    expect(fechas).toEqual([...fechas].sort())
  })

  it('el préstamo de 6 cuotas ya no aparece pasado su fin', () => {
    // termina en diciembre 2026 (jul..dic)
    expect(eventosDelMes(datos, '2026-12').some((e) => e.titulo === 'Banco')).toBe(true)
    expect(eventosDelMes(datos, '2027-01').some((e) => e.titulo === 'Banco')).toBe(false)
  })

  it('recurrente mensual reaparece en meses siguientes', () => {
    const ev = eventosDelMes(datos, '2026-09')
    expect(ev.find((e) => e.titulo === 'Luz')?.fecha).toBe('2026-09-12')
  })

  it('obligaciones próximas dentro del horizonte de días', () => {
    // hoy = 10 de julio: la TV (15) está a 5 días, ABL (20) a 10, luz (12) a 2
    const rec = obligacionesProximas(datos, '2026-07-10', 10)
    const titulos = rec.map((r) => r.titulo)
    expect(titulos).toContain('Luz') // 2 días
    expect(titulos).toContain('TV') // 5 días
    expect(titulos).toContain('ABL') // 10 días
    // el sueldo (ingreso) no es obligación
    expect(titulos).not.toContain('Sueldo')
    // ordenadas por cercanía
    const dias = rec.map((r) => r.diasRestantes)
    expect(dias).toEqual([...dias].sort((a, b) => a - b))
  })

  it('excluye obligaciones ya vencidas o fuera del rango', () => {
    // hoy = 16 de julio: la TV (15) ya venció, la luz (12) también
    const rec = obligacionesProximas(datos, '2026-07-16', 10)
    const titulos = rec.map((r) => r.titulo)
    expect(titulos).not.toContain('TV')
    expect(titulos).not.toContain('Luz')
    expect(titulos).toContain('ABL') // 20 → a 4 días
  })
})
