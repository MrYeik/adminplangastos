import { create } from 'zustand'
import type { Configuracion } from '@/models'
import { obtenerConfig, guardarConfig } from '@/db/config'
import { formatMoney as fmt } from '@/lib/money'

interface ConfigState {
  config: Configuracion | null
  cargar: () => Promise<void>
  actualizar: (cambios: Partial<Configuracion>) => Promise<void>
  /** Formatea centavos usando el símbolo configurado. */
  money: (centavos: number, conDecimales?: boolean) => string
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  cargar: async () => {
    const config = await obtenerConfig()
    set({ config })
  },
  actualizar: async (cambios) => {
    await guardarConfig(cambios)
    const config = await obtenerConfig()
    set({ config })
  },
  money: (centavos, conDecimales = false) => {
    const simbolo = get().config?.simboloMoneda ?? '$'
    return fmt(centavos, simbolo, conDecimales)
  },
}))
