import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { useConfigStore } from '@/store/configStore'
import { etiquetaMes } from '@/lib/dates'
import type { GrupoMes } from '@/lib/historial'

/**
 * Historial "pagados por mes": una tarjeta por mes (más reciente primero);
 * al tocarla se abre un pop-up con el detalle de lo pagado ese mes.
 */
export default function PagadosPorMes({
  titulo = 'Pagados por mes',
  tituloPopup = 'Pagados',
  grupos,
}: {
  titulo?: string
  tituloPopup?: string
  grupos: GrupoMes[]
}) {
  const money = useConfigStore((s) => s.money)
  const [verMes, setVerMes] = useState<string | null>(null)
  if (grupos.length === 0) return null
  const sel = grupos.find((g) => g.mes === verMes)

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-slate-500">
        {titulo} ({grupos.length})
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {grupos.map((g) => (
          <button
            key={g.mes}
            onClick={() => setVerMes(g.mes)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-slate-50"
          >
            <div className="text-sm font-medium capitalize text-slate-800">{etiquetaMes(g.mes, true)}</div>
            <div className="text-xs text-slate-400">
              {g.items.length} {g.items.length === 1 ? 'ítem' : 'ítems'} · ver detalle
            </div>
            <div className="mt-1 text-sm font-semibold tabular text-slate-700">{money(g.total)}</div>
          </button>
        ))}
      </div>

      <Modal
        abierto={verMes != null}
        titulo={`${tituloPopup} · ${verMes ? etiquetaMes(verMes, true) : ''}`}
        onCerrar={() => setVerMes(null)}
        ancho="max-w-md"
      >
        {sel && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {sel.items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{it.descripcion}</div>
                        {it.detalle && <div className="text-xs text-slate-400">{it.detalle}</div>}
                      </td>
                      <td className="px-3 py-2 text-right tabular text-slate-900">{money(it.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between px-1 text-sm">
              <span className="text-slate-500">{sel.items.length} ítem(s)</span>
              <span className="font-semibold tabular text-slate-800">{money(sel.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
