import { create } from 'zustand'
import type { Cotizacion } from '@/models'
import { hoyISO } from '@/lib/dates'
import { fetchCotizacionOficial } from '@/lib/cotizacion'
import { cotizacionesRepo } from '@/db/repos/cotizaciones'

interface CotizacionState {
  cotizacion: Cotizacion | null // última conocida (puede ser de un día previo)
  cargando: boolean
  error: string | null
  /** Muestra la cacheada y, si no hay una de hoy, intenta traerla. */
  asegurarHoy: () => Promise<void>
  /** Fuerza traer la cotización del día desde la API. */
  refrescar: () => Promise<void>
}

export const useCotizacionStore = create<CotizacionState>((set, get) => ({
  cotizacion: null,
  cargando: false,
  error: null,
  asegurarHoy: async () => {
    const hoy = hoyISO()
    const deHoy = await cotizacionesRepo.deFecha(hoy)
    if (deHoy) {
      set({ cotizacion: deHoy, error: null })
      return
    }
    // Mostramos la última conocida mientras traemos la de hoy.
    const ultima = await cotizacionesRepo.ultima()
    if (ultima) set({ cotizacion: ultima })
    await get().refrescar()
  },
  refrescar: async () => {
    set({ cargando: true, error: null })
    try {
      const c = await fetchCotizacionOficial()
      await cotizacionesRepo.guardar(c)
      set({ cotizacion: c, cargando: false })
    } catch {
      set({ cargando: false, error: 'No se pudo actualizar la cotización' })
    }
  },
}))
