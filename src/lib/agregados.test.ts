import { describe, it, expect } from 'vitest'
import {
  resumenMes,
  ingresosDelMes,
  gastosDelMes,
  cuotasTarjetaDelMes,
  egresosPorCategoria,
  deudaPendiente,
  proximosVencimientos,
  saldoArrastrado,
  type DatosFinancieros,
} from './agregados'
import type { Ingreso, Gasto, CompraTarjeta, Prestamo } from '@/models'

const ingresos: Ingreso[] = [
  { id: 1, descripcion: 'Sueldo', categoria: 'Sueldo', fecha: '2026-07-01', importe: 100_000_00, repeticionMensual: true },
  { id: 2, descripcion: 'Aguinaldo', categoria: 'Aguinaldo', fecha: '2026-07-15', importe: 50_000_00, repeticionMensual: false },
]

const gastos: Gasto[] = [
  { id: 1, descripcion: 'Alquiler', categoria: 'Vivienda', fecha: '2026-07-01', importe: 40_000_00, repetitivoMensual: true, tipo: 'fijo' },
  { id: 2, descripcion: 'Súper', categoria: 'Alimentación', fecha: '2026-07-10', importe: 20_000_00, repetitivoMensual: false, tipo: 'variable' },
]

const compras: CompraTarjeta[] = [
  { id: 1, tarjetaId: 1, descripcion: 'TV', fechaCompra: '2026-07-15', cantidadCuotas: 12, cuotaActual: 1, importePorCuota: 5_000_00 },
]

const prestamos: Prestamo[] = [
  { id: 1, entidad: 'Banco', fecha: '2026-07-01', capital: 100_000_00, cantidadCuotas: 10, valorCuota: 10_000_00, cuotaActual: 1 },
]

const datos: DatosFinancieros = { ingresos, gastos, compras, prestamos }

describe('agregación mensual', () => {
  it('ingresos: recurrente aplica a meses futuros, único solo a su mes', () => {
    expect(ingresosDelMes(ingresos, '2026-07')).toBe(150_000_00) // sueldo + aguinaldo
    expect(ingresosDelMes(ingresos, '2026-08')).toBe(100_000_00) // solo sueldo
    expect(ingresosDelMes(ingresos, '2026-06')).toBe(0) // antes de empezar
  })

  it('gastos: separa fijos y variables y respeta recurrencia', () => {
    expect(gastosDelMes(gastos, '2026-07', 'fijo')).toBe(40_000_00)
    expect(gastosDelMes(gastos, '2026-07', 'variable')).toBe(20_000_00)
    expect(gastosDelMes(gastos, '2026-08')).toBe(40_000_00) // solo alquiler recurrente
  })

  it('cuotas de tarjeta caen solo dentro del rango', () => {
    expect(cuotasTarjetaDelMes(compras, '2026-07')).toBe(5_000_00)
    expect(cuotasTarjetaDelMes(compras, '2027-06')).toBe(5_000_00) // última cuota
    expect(cuotasTarjetaDelMes(compras, '2027-07')).toBe(0) // ya terminó
  })

  it('resumen del mes combina todo', () => {
    const r = resumenMes(datos, '2026-07')
    expect(r.ingresos).toBe(150_000_00)
    expect(r.gastos).toBe(60_000_00)
    expect(r.cuotasTarjeta).toBe(5_000_00)
    expect(r.cuotasPrestamo).toBe(10_000_00)
    expect(r.cuotas).toBe(15_000_00)
    expect(r.egresos).toBe(75_000_00)
    expect(r.disponible).toBe(75_000_00) // 150k - 75k
  })

  it('mes futuro: sin aguinaldo ni gasto variable único', () => {
    const r = resumenMes(datos, '2026-08')
    expect(r.ingresos).toBe(100_000_00)
    expect(r.gastos).toBe(40_000_00)
    expect(r.cuotas).toBe(15_000_00)
    expect(r.disponible).toBe(45_000_00)
  })

  it('egresos por categoría incluye cuotas como categoría', () => {
    const dist = egresosPorCategoria(datos, '2026-07')
    const cuotas = dist.find((d) => d.categoria === 'Cuotas')
    expect(cuotas?.total).toBe(15_000_00)
    const vivienda = dist.find((d) => d.categoria === 'Vivienda')
    expect(vivienda?.total).toBe(40_000_00)
    // ordenado desc
    expect(dist[0].total).toBeGreaterThanOrEqual(dist[dist.length - 1].total)
  })

  it('deuda pendiente suma tarjetas y préstamos desde el mes', () => {
    // TV: 12 * 5.000 = 60.000 ; Préstamo: 10 * 10.000 = 100.000
    expect(deudaPendiente(compras, prestamos, '2026-07')).toBe(160_000_00)
  })

  it('próximos vencimientos ordenados por mes', () => {
    const v = proximosVencimientos(compras, prestamos, '2026-07')
    expect(v).toHaveLength(2)
    expect(v.every((x) => x.mes === '2026-07')).toBe(true)
  })

  it('saldo arrastrado acumula el disponible de los meses previos', () => {
    // disponible jul = 75.000 ; ago = 45.000
    expect(saldoArrastrado(datos, '2026-07', '2026-07')).toBe(0) // mes de inicio
    expect(saldoArrastrado(datos, '2026-08', '2026-07')).toBe(75_000_00) // arrastra julio
    expect(saldoArrastrado(datos, '2026-09', '2026-07')).toBe(120_000_00) // julio + agosto
  })

  it('gastos con cambio de importe: rige a futuro sin tocar el pasado', () => {
    const g: Gasto[] = [
      {
        id: 9,
        descripcion: 'Luz',
        categoria: 'Servicios',
        fecha: '2026-07-01',
        importe: 10_000_00,
        repetitivoMensual: true,
        tipo: 'fijo',
        importes: [{ desde: '2026-09', importe: 13_000_00 }],
      },
    ]
    expect(gastosDelMes(g, '2026-08')).toBe(10_000_00) // antes del cambio
    expect(gastosDelMes(g, '2026-09')).toBe(13_000_00) // desde el cambio
  })
})
