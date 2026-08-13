// Cotización del dólar oficial (Banco Nación). Como bna.com.ar bloquea el
// acceso por CORS desde el navegador, se toma de dolarapi.com, que publica la
// misma cotización oficial del BNA. Importes en centavos ARS por 1 USD.

import type { Cotizacion } from '@/models'
import { hoyISO } from './dates'

const URL_OFICIAL = 'https://dolarapi.com/v1/dolares/oficial'

/** Convierte centavos de USD a centavos de ARS con una cotización (centavos ARS/USD). */
export function convertirUsdAArs(centavosUsd: number, cotizacionCentavos: number): number {
  return Math.round((centavosUsd * cotizacionCentavos) / 100)
}

/**
 * Trae la cotización oficial (BNA) desde dolarapi y la normaliza a centavos.
 * Lanza si falla la red o el formato es inesperado.
 */
export async function fetchCotizacionOficial(fecha = hoyISO()): Promise<Cotizacion> {
  const r = await fetch(URL_OFICIAL, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  const compra = Math.round(Number(j.compra) * 100)
  const venta = Math.round(Number(j.venta) * 100)
  if (!Number.isFinite(compra) || !Number.isFinite(venta) || compra <= 0 || venta <= 0) {
    throw new Error('Respuesta sin cotización válida')
  }
  return {
    fecha,
    compra,
    venta,
    promedio: Math.round((compra + venta) / 2),
    fuente: 'BNA (dolarapi)',
    obtenidoEn: new Date().toISOString(),
  }
}
