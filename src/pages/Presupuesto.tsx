import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Copy, TrendingUp, Receipt, CreditCard, Wallet, Repeat } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import MoneyInput from '@/components/ui/MoneyInput'
import MonthNav from '@/components/ui/MonthNav'
import { Campo } from '@/components/ui/Form'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { presupuestosRepo } from '@/db/repos/presupuestos'
import { resumenMes, egresosPorCategoria } from '@/lib/agregados'
import { mesActual, sumarMeses, etiquetaMes } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Presupuesto as TPresupuesto } from '@/models'

export default function Presupuesto() {
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const [mes, setMes] = useState(mesActual())

  const presupuestos = useLiveQuery(() => presupuestosRepo.delMes(mes), [mes], [] as TPresupuesto[])

  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Record<string, number>>({})

  const r = resumenMes(datos, mes)
  const realPorCat = new Map(egresosPorCategoria(datos, mes).map((d) => [d.categoria, d.total]))
  const presupPorCat = new Map(presupuestos.map((p) => [p.categoria, p.montoEstimado]))

  // Categorías a mostrar: las configuradas + "Cuotas" + las que tengan real o presupuesto
  const categorias = Array.from(
    new Set([
      ...(config?.categorias ?? []),
      'Cuotas',
      ...realPorCat.keys(),
      ...presupPorCat.keys(),
    ]),
  )

  const totalReal = Array.from(realPorCat.values()).reduce((a, b) => a + b, 0)
  const totalPresup = presupuestos.reduce((a, p) => a + p.montoEstimado, 0)

  const abrirEdicion = () => {
    const inicial: Record<string, number> = {}
    for (const c of categorias) inicial[c] = presupPorCat.get(c) ?? 0
    setBorrador(inicial)
    setEditando(true)
  }
  const guardarPresupuesto = async () => {
    for (const [categoria, monto] of Object.entries(borrador)) {
      await presupuestosRepo.upsert(categoria, mes, monto)
    }
    setEditando(false)
  }
  const copiarMesAnterior = async () => {
    await presupuestosRepo.copiarMes(sumarMeses(mes, -1), mes)
  }

  const flujo = [
    { label: 'Ingresos', valor: r.ingresos, icon: TrendingUp, color: 'text-emerald-600', signo: '' },
    { label: 'Gastos fijos', valor: r.gastosFijos, icon: Receipt, color: 'text-indigo-600', signo: '−' },
    { label: 'Gastos variables', valor: r.gastosVariables, icon: Receipt, color: 'text-amber-600', signo: '−' },
    { label: 'Cuotas', valor: r.cuotas, icon: CreditCard, color: 'text-rose-600', signo: '−' },
    { label: 'Servicios', valor: r.servicios, icon: Repeat, color: 'text-cyan-600', signo: '−' },
  ]

  return (
    <PageShell
      titulo="Presupuesto mensual"
      descripcion="Flujo del mes y comparación contra lo presupuestado"
      acciones={<MonthNav mes={mes} onCambiar={setMes} />}
    >
      {/* Flujo del mes */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {flujo.map((f) => (
          <div key={f.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <f.icon size={16} className={f.color} />
              {f.label}
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900 tabular">
              {f.signo}
              {formatMoney(f.valor)}
            </div>
          </div>
        ))}
        <div
          className={`rounded-xl border p-4 ${
            r.disponible >= 0
              ? 'border-brand-200 bg-brand-50'
              : 'border-rose-200 bg-rose-50'
          }`}
        >
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Wallet size={16} className={r.disponible >= 0 ? 'text-brand-600' : 'text-rose-600'} />
            Saldo disponible
          </div>
          <div
            className={`mt-1 text-lg font-bold tabular ${
              r.disponible >= 0 ? 'text-brand-700' : 'text-rose-700'
            }`}
          >
            {formatMoney(r.disponible)}
          </div>
        </div>
      </div>

      {/* Comparación real vs presupuesto */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-800">
            Real vs. presupuesto · {etiquetaMes(mes)}
          </h2>
          <div className="flex gap-2">
            <Button variante="secondary" onClick={copiarMesAnterior}>
              <Copy size={16} /> Copiar mes anterior
            </Button>
            <Button onClick={abrirEdicion}>
              <Pencil size={16} /> Editar presupuesto
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Categoría</th>
              <th className="px-5 py-3 text-right font-medium">Real</th>
              <th className="px-5 py-3 text-right font-medium">Presupuesto</th>
              <th className="px-5 py-3 text-right font-medium">Diferencia</th>
              <th className="w-40 px-5 py-3 font-medium">Uso</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat) => {
              const real = realPorCat.get(cat) ?? 0
              const presup = presupPorCat.get(cat) ?? 0
              const dif = presup - real // positivo = queda margen
              const pct = presup > 0 ? Math.min(100, Math.round((real / presup) * 100)) : 0
              const excedido = presup > 0 && real > presup
              if (real === 0 && presup === 0) return null
              return (
                <tr key={cat} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{cat}</td>
                  <td className="px-5 py-3 text-right tabular text-slate-900">{formatMoney(real)}</td>
                  <td className="px-5 py-3 text-right tabular text-slate-500">
                    {presup > 0 ? formatMoney(presup) : '—'}
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular font-medium ${
                      presup === 0 ? 'text-slate-300' : dif >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {presup > 0 ? `${dif >= 0 ? '+' : ''}${formatMoney(dif)}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {presup > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              excedido ? 'bg-rose-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={`w-10 text-right text-xs tabular ${
                            excedido ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">Sin meta</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right tabular">{formatMoney(totalReal)}</td>
              <td className="px-5 py-3 text-right tabular">
                {totalPresup > 0 ? formatMoney(totalPresup) : '—'}
              </td>
              <td className="px-5 py-3 text-right tabular">
                {totalPresup > 0 ? formatMoney(totalPresup - totalReal) : '—'}
              </td>
              <td className="px-5 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal editar presupuesto */}
      <Modal
        abierto={editando}
        titulo={`Presupuesto de ${etiquetaMes(mes, true)}`}
        onCerrar={() => setEditando(false)}
        ancho="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Definí el monto estimado por categoría. Dejalo en 0 para quitarlo.
          </p>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {categorias.map((cat) => (
              <Campo key={cat} label={cat}>
                <MoneyInput
                  value={borrador[cat] ?? 0}
                  onChange={(v) => setBorrador((b) => ({ ...b, [cat]: v }))}
                />
              </Campo>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variante="secondary" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPresupuesto}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}
