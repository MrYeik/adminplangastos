import { describe, it, expect } from 'vitest'
import { buscar, normalizar, type FuentesBusqueda } from './busqueda'

const fuentes: FuentesBusqueda = {
  ingresos: [
    { id: 1, descripcion: 'Sueldo julio', categoria: 'Sueldo', fecha: '2026-07-01', importe: 100_00, repeticionMensual: true },
  ],
  gastos: [
    { id: 1, descripcion: 'Nafta', categoria: 'Transporte', fecha: '2026-07-10', importe: 200_00, repetitivoMensual: false, tipo: 'variable', responsable: 'Ana' },
  ],
  compras: [
    { id: 1, tarjetaId: 1, descripcion: 'Heladera', fechaCompra: '2026-06-15', comercio: 'Frávega', cantidadCuotas: 12, cuotaActual: 1, importePorCuota: 500_00 },
  ],
  prestamos: [
    { id: 1, entidad: 'Banco Nación', fecha: '2026-05-01', capital: 0, cantidadCuotas: 24, valorCuota: 800_00, cuotaActual: 1 },
  ],
  prestados: [
    { id: 1, persona: 'Juan', concepto: 'Auto', importe: 5000_00, fecha: '2026-04-01', estado: 'pendiente' },
  ],
  tarjetas: [{ id: 1, nombre: 'Visa', color: '#000' }],
  servicios: [],
}

describe('búsqueda', () => {
  it('normaliza acentos y mayúsculas', () => {
    expect(normalizar('Frávega')).toBe('fravega')
    expect(normalizar('Nación')).toBe('nacion')
  })

  it('busca por descripción sin importar acentos', () => {
    const r = buscar(fuentes, { texto: 'fravega' })
    expect(r).toHaveLength(1)
    expect(r[0].titulo).toBe('Heladera')
  })

  it('encuentra por nombre de tarjeta', () => {
    const r = buscar(fuentes, { texto: 'visa' })
    expect(r.some((x) => x.titulo === 'Heladera')).toBe(true)
  })

  it('encuentra por persona y responsable', () => {
    expect(buscar(fuentes, { texto: 'juan' }).map((r) => r.titulo)).toContain('Juan')
    expect(buscar(fuentes, { texto: 'ana' }).map((r) => r.titulo)).toContain('Nafta')
  })

  it('filtra por tipo', () => {
    const r = buscar(fuentes, { tipo: 'prestamo' })
    expect(r).toHaveLength(1)
    expect(r[0].titulo).toBe('Banco Nación')
  })

  it('filtra por rango de fechas', () => {
    const r = buscar(fuentes, { desde: '2026-07-01', hasta: '2026-07-31' })
    expect(r.map((x) => x.titulo).sort()).toEqual(['Nafta', 'Sueldo julio'])
  })

  it('varias palabras deben coincidir todas', () => {
    expect(buscar(fuentes, { texto: 'sueldo julio' })).toHaveLength(1)
    expect(buscar(fuentes, { texto: 'sueldo nafta' })).toHaveLength(0)
  })

  it('ordena por fecha descendente', () => {
    const r = buscar(fuentes, {})
    const fechas = r.map((x) => x.fecha)
    expect(fechas).toEqual([...fechas].sort().reverse())
  })
})
