import { describe, it, expect } from 'vitest'
import {
  autoMapear,
  parseFechaFlexible,
  filaARegistro,
  procesarFilas,
  parseCSV,
  detectarDelimitador,
} from './importar'
import type { Gasto, Ingreso } from '@/models'

describe('parser CSV', () => {
  it('parsea filas y columnas', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6'
    expect(parseCSV(csv)).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it('mantiene los valores como texto crudo (no coerciona números ni fechas)', () => {
    const csv = 'Fecha,Importe\n05/07/2026,40.000'
    const filas = parseCSV(csv)
    expect(filas[1]).toEqual(['05/07/2026', '40.000'])
  })

  it('soporta campos entre comillas con comas adentro', () => {
    const csv = 'desc,monto\n"Pago, cuota 1",1.000'
    expect(parseCSV(csv)[1]).toEqual(['Pago, cuota 1', '1.000'])
  })

  it('detecta el delimitador punto y coma', () => {
    expect(detectarDelimitador('a;b;c\n1;2;3')).toBe(';')
    expect(detectarDelimitador('a,b,c')).toBe(',')
    expect(parseCSV('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('importación CSV/Excel', () => {
  it('parsea fechas en varios formatos', () => {
    expect(parseFechaFlexible('2026-07-05')).toBe('2026-07-05')
    expect(parseFechaFlexible('5/7/2026')).toBe('2026-07-05')
    expect(parseFechaFlexible('05-07-2026')).toBe('2026-07-05')
    expect(parseFechaFlexible('5/7/26')).toBe('2026-07-05')
    expect(parseFechaFlexible('texto')).toBeNull()
  })

  it('auto-mapea columnas por encabezado', () => {
    const headers = ['Fecha', 'Detalle', 'Monto', 'Rubro', 'Medio de pago']
    const m = autoMapear(headers, 'gastos')
    expect(m.fecha).toBe(0)
    expect(m.descripcion).toBe(1)
    expect(m.importe).toBe(2)
    expect(m.categoria).toBe(3)
    expect(m.medioPago).toBe(4)
  })

  it('convierte una fila a gasto', () => {
    const headers = ['Fecha', 'Descripción', 'Importe', 'Categoría', 'Tipo']
    const m = autoMapear(headers, 'gastos')
    const r = filaARegistro(['05/07/2026', 'Alquiler', '40.000', 'Vivienda', 'fijo'], m, 'gastos', 2)
    expect(r.ok).toBe(true)
    const g = r.registro as Gasto
    expect(g.descripcion).toBe('Alquiler')
    expect(g.importe).toBe(4_000_000) // 40.000 -> centavos
    expect(g.fecha).toBe('2026-07-05')
    expect(g.categoria).toBe('Vivienda')
    expect(g.tipo).toBe('fijo')
  })

  it('convierte una fila a ingreso con repetición', () => {
    const headers = ['Descripción', 'Importe', 'Mensual']
    const m = autoMapear(headers, 'ingresos')
    const r = filaARegistro(['Sueldo', '150.000', 'sí'], m, 'ingresos', 2)
    expect(r.ok).toBe(true)
    const i = r.registro as Ingreso
    expect(i.repeticionMensual).toBe(true)
    expect(i.importe).toBe(15_000_000)
  })

  it('marca filas inválidas', () => {
    const headers = ['Descripción', 'Importe']
    const m = autoMapear(headers, 'gastos')
    expect(filaARegistro(['', '100'], m, 'gastos', 2).ok).toBe(false)
    expect(filaARegistro(['Algo', 'abc'], m, 'gastos', 3).ok).toBe(false)
    expect(filaARegistro(['Algo', '0'], m, 'gastos', 4).error).toBe('Importe inválido')
  })

  it('usa la fecha de hoy si falta o es inválida', () => {
    const headers = ['Descripción', 'Importe', 'Fecha']
    const m = autoMapear(headers, 'gastos')
    const r = filaARegistro(['Algo', '100', ''], m, 'gastos', 2)
    expect(r.ok).toBe(true)
    expect((r.registro as Gasto).fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('procesa varias filas separando válidas de errores', () => {
    const headers = ['Descripción', 'Importe']
    const m = autoMapear(headers, 'gastos')
    const filas = [
      ['Alquiler', '40.000'],
      ['', '10'],
      ['Luz', '8.000'],
    ]
    const res = procesarFilas(filas, m, 'gastos')
    expect(res.filter((r) => r.ok)).toHaveLength(2)
    expect(res.filter((r) => !r.ok)).toHaveLength(1)
  })
})
