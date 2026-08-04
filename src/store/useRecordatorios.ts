import { useDatosFinancieros } from './useDatosFinancieros'
import { useConfigStore } from './configStore'
import { obligacionesProximas, type Recordatorio } from '@/lib/eventos'
import { hoyISO } from '@/lib/dates'

/** Obligaciones próximas a vencer dentro de `maxDias` (por defecto, el umbral mayor configurado). */
export function useRecordatorios(maxDias?: number): Recordatorio[] {
  const datos = useDatosFinancieros()
  const config = useConfigStore((s) => s.config)
  const umbral = maxDias ?? Math.max(...(config?.notificacionDias ?? [10]))
  return obligacionesProximas(datos, hoyISO(), umbral)
}
