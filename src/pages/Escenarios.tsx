import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Trash2,
  Landmark,
  CreditCard,
  TrendingUp,
  Receipt,
  RotateCcw,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput, Select } from '@/components/ui/Form'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { resumenMes, serieMensual } from '@/lib/agregados'
import { aplicarEscenario, escenarioTieneAjustes, ESCENARIO_VACIO, type Escenario } from '@/lib/simulacion'
import { mesActual, ventanaMeses, etiquetaMes } from '@/lib/dates'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import type { TipoGasto } from '@/models'

type TipoItem = 'prestamo' | 'compra' | 'ingreso' | 'gasto'

const nuevoId = () => Math.random().toString(36).slice(2)

export default function Escenarios() {
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const mes = mesActual()

  const [esc, setEsc] = useState<Escenario>(ESCENARIO_VACIO)
  const [modal, setModal] = useState<TipoItem | null>(null)
  const [f, setF] = useState({ importe: 0, cantidadCuotas: 12, desde: mes, tipo: 'fijo' as TipoGasto })

  const datosSim = aplicarEscenario(datos, esc)
  const tieneAjustes = escenarioTieneAjustes(esc)

  const rActual = resumenMes(datos, mes)
  const rSim = resumenMes(datosSim, mes)

  const ventana = ventanaMeses(config?.mesInicioProyeccion ?? mes, 12)
  const serieActual = serieMensual(datos, ventana)
  const serieSim = serieMensual(datosSim, ventana)
  const chart = ventana.map((m, i) => ({
    mes: etiquetaMes(m),
    Actual: serieActual[i].disponible,
    Simulado: serieSim[i].disponible,
  }))

  const abrir = (tipo: TipoItem) => {
    setF({ importe: 0, cantidadCuotas: 12, desde: mes, tipo: 'fijo' })
    setModal(tipo)
  }

  const agregar = () => {
    if (!modal || f.importe <= 0) return
    const id = nuevoId()
    setEsc((e) => {
      if (modal === 'prestamo')
        return { ...e, prestamos: [...e.prestamos, { id, valorCuota: f.importe, cantidadCuotas: f.cantidadCuotas, desde: f.desde }] }
      if (modal === 'compra')
        return { ...e, compras: [...e.compras, { id, importePorCuota: f.importe, cantidadCuotas: f.cantidadCuotas, desde: f.desde }] }
      if (modal === 'ingreso')
        return { ...e, ingresos: [...e.ingresos, { id, importe: f.importe, desde: f.desde }] }
      return { ...e, gastos: [...e.gastos, { id, importe: f.importe, desde: f.desde, tipo: f.tipo }] }
    })
    setModal(null)
  }

  const quitar = (tipo: TipoItem, id: string) =>
    setEsc((e) => ({
      ...e,
      prestamos: tipo === 'prestamo' ? e.prestamos.filter((x) => x.id !== id) : e.prestamos,
      compras: tipo === 'compra' ? e.compras.filter((x) => x.id !== id) : e.compras,
      ingresos: tipo === 'ingreso' ? e.ingresos.filter((x) => x.id !== id) : e.ingresos,
      gastos: tipo === 'gasto' ? e.gastos.filter((x) => x.id !== id) : e.gastos,
    }))

  const delta = (actual: number, sim: number) => sim - actual

  const Kpi = ({ label, actual, sim }: { label: string; actual: number; sim: number }) => {
    const d = delta(actual, sim)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-slate-400 line-through tabular">{formatMoney(actual)}</span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className="text-lg font-bold text-slate-900 tabular">{formatMoney(sim)}</span>
        </div>
        {d !== 0 && (
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${d > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {d > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {formatMoney(Math.abs(d))}
          </div>
        )}
      </div>
    )
  }

  const BOTONES: { tipo: TipoItem; label: string; icon: typeof Landmark }[] = [
    { tipo: 'prestamo', label: 'Préstamo', icon: Landmark },
    { tipo: 'compra', label: 'Compra en cuotas', icon: CreditCard },
    { tipo: 'ingreso', label: 'Ingreso extra', icon: TrendingUp },
    { tipo: 'gasto', label: 'Gasto extra', icon: Receipt },
  ]

  const items: { tipo: TipoItem; id: string; texto: string }[] = [
    ...esc.prestamos.map((x) => ({ tipo: 'prestamo' as const, id: x.id, texto: `Préstamo · ${formatMoney(x.valorCuota)} × ${x.cantidadCuotas} desde ${etiquetaMes(x.desde)}` })),
    ...esc.compras.map((x) => ({ tipo: 'compra' as const, id: x.id, texto: `Compra · ${formatMoney(x.importePorCuota)} × ${x.cantidadCuotas} desde ${etiquetaMes(x.desde)}` })),
    ...esc.ingresos.map((x) => ({ tipo: 'ingreso' as const, id: x.id, texto: `Ingreso extra · ${formatMoney(x.importe)}/mes desde ${etiquetaMes(x.desde)}` })),
    ...esc.gastos.map((x) => ({ tipo: 'gasto' as const, id: x.id, texto: `Gasto ${x.tipo} · ${formatMoney(x.importe)}/mes desde ${etiquetaMes(x.desde)}` })),
  ]

  const tituloModal =
    modal === 'prestamo' ? 'Simular préstamo' :
    modal === 'compra' ? 'Simular compra en cuotas' :
    modal === 'ingreso' ? 'Simular ingreso extra' : 'Simular gasto extra'

  return (
    <PageShell
      titulo="Escenarios"
      descripcion="Simulá cambios y mirá el impacto sin tocar tus datos reales"
      acciones={
        tieneAjustes && (
          <Button variante="secondary" onClick={() => setEsc(ESCENARIO_VACIO)}>
            <RotateCcw size={16} /> Reiniciar
          </Button>
        )
      }
    >
      {/* Constructor del escenario */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ajuste de ingresos: <span className="text-brand-600">{esc.ajusteIngresosPct > 0 ? '+' : ''}{esc.ajusteIngresosPct}%</span>
            </label>
            <input
              type="range"
              min={-50}
              max={100}
              step={5}
              value={esc.ajusteIngresosPct}
              onChange={(e) => setEsc((s) => ({ ...s, ajusteIngresosPct: Number(e.target.value) }))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400"><span>−50%</span><span>0</span><span>+100%</span></div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Agregar al escenario</span>
            <div className="flex flex-wrap gap-2">
              {BOTONES.map(({ tipo, label, icon: Icon }) => (
                <button
                  key={tipo}
                  onClick={() => abrir(tipo)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{it.texto}</span>
                <button onClick={() => quitar(it.tipo, it.id)} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600" aria-label="Quitar">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!tieneAjustes ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          Aplicá un ajuste (mové el ingreso o agregá un préstamo/compra) para ver el impacto.
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs comparados */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi label={`Ingreso · ${etiquetaMes(mes)}`} actual={rActual.ingresos} sim={rSim.ingresos} />
            <Kpi label={`Cuotas · ${etiquetaMes(mes)}`} actual={rActual.cuotas} sim={rSim.cuotas} />
            <Kpi label={`Disponible · ${etiquetaMes(mes)}`} actual={rActual.disponible} sim={rSim.disponible} />
          </div>

          {/* Comparación de la evolución */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-800">Disponible: actual vs. simulado (12 meses)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => formatMoneyCompact(Number(v))} width={70} />
                <Tooltip formatter={(v: number | string) => formatMoney(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="Actual" stroke="#94a3b8" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Simulado" stroke="#0d9488" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Modal para agregar item */}
      <Modal abierto={modal != null} titulo={tituloModal} onCerrar={() => setModal(null)} ancho="max-w-md">
        <div className="space-y-4">
          <Campo label={modal === 'prestamo' ? 'Valor de la cuota' : modal === 'compra' ? 'Importe por cuota' : 'Importe mensual'} requerido>
            <MoneyInput value={f.importe} onChange={(importe) => setF((s) => ({ ...s, importe }))} autoFocus />
          </Campo>
          {(modal === 'prestamo' || modal === 'compra') && (
            <Campo label="Cantidad de cuotas" requerido>
              <TextInput type="number" min={1} value={f.cantidadCuotas} onChange={(e) => setF((s) => ({ ...s, cantidadCuotas: Number(e.target.value) }))} />
            </Campo>
          )}
          {modal === 'gasto' && (
            <Campo label="Tipo">
              <Select value={f.tipo} onChange={(e) => setF((s) => ({ ...s, tipo: e.target.value as TipoGasto }))}>
                <option value="fijo">Fijo</option>
                <option value="variable">Variable</option>
              </Select>
            </Campo>
          )}
          <Campo label="Desde el mes">
            <TextInput type="month" value={f.desde} onChange={(e) => setF((s) => ({ ...s, desde: e.target.value }))} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Button variante="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={agregar} disabled={f.importe <= 0}>Agregar al escenario</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}
