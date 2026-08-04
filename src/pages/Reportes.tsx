import { useState } from 'react'
import { FileText, FileSpreadsheet, PiggyBank, CreditCard, Scale, Layers, TrendingDown } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import MonthNav from '@/components/ui/MonthNav'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { reporteMensual, reporteAnual } from '@/lib/reportes'
import { calcularIndicadores } from '@/lib/indicadores'
import { exportarPDF, exportarExcel } from '@/lib/exportar'
import { mesActual, etiquetaMes } from '@/lib/dates'
import type { LucideIcon } from 'lucide-react'

type Modo = 'mensual' | 'anual'

export default function Reportes() {
  const datos = useDatosFinancieros()
  const [modo, setModo] = useState<Modo>('mensual')
  const [mes, setMes] = useState(mesActual())

  const rep = modo === 'mensual' ? reporteMensual(datos, mes) : reporteAnual(datos, mes)
  const ind = calcularIndicadores(datos, mes)

  const indicadores: { label: string; valor: string; icon: LucideIcon; color: string }[] = [
    { label: 'Capacidad de ahorro', valor: `${ind.tasaAhorro}%`, icon: PiggyBank, color: 'text-indigo-600' },
    { label: 'Sueldo comprometido', valor: `${ind.comprometidoCuotas}%`, icon: CreditCard, color: 'text-amber-600' },
    { label: 'Egresos / ingresos', valor: `${ind.ratioEgresos}%`, icon: Scale, color: 'text-rose-600' },
    { label: 'Gastos fijos', valor: `${ind.pctGastosFijos}%`, icon: Layers, color: 'text-cyan-600' },
    { label: 'Deuda en meses', valor: `${ind.mesesDeDeuda}`, icon: TrendingDown, color: 'text-orange-600' },
  ]

  return (
    <PageShell
      titulo="Reportes"
      descripcion="Resumen exportable a PDF y Excel"
      acciones={
        <div className="flex gap-2">
          <Button variante="secondary" onClick={() => exportarExcel(rep)}>
            <FileSpreadsheet size={16} /> Excel
          </Button>
          <Button onClick={() => exportarPDF(rep)}>
            <FileText size={16} /> PDF
          </Button>
        </div>
      }
    >
      {/* Controles */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {(['mensual', 'anual'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`rounded-md px-4 py-1.5 text-sm capitalize transition-colors ${
                modo === m ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m === 'mensual' ? 'Mensual' : 'Anual'}
            </button>
          ))}
        </div>
        <MonthNav mes={mes} onCambiar={setMes} />
        {modo === 'anual' && (
          <span className="text-sm text-slate-400">12 meses desde {etiquetaMes(mes, true)}</span>
        )}
      </div>

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {indicadores.map((i) => (
          <div key={i.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{i.label}</span>
              <i.icon size={16} className={i.color} />
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 tabular">{i.valor}</div>
          </div>
        ))}
      </div>

      {/* Resumen del reporte */}
      <div className="mb-4 flex flex-wrap gap-2">
        {rep.resumen.map((r) => (
          <div key={r.label} className="rounded-lg border border-slate-200 bg-white px-4 py-2">
            <span className="text-xs text-slate-500">{r.label}: </span>
            <span className="text-sm font-semibold tabular text-slate-800">{r.valor}</span>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {rep.columnas.map((c, i) => (
                <th key={c} className={`px-4 py-3 font-medium ${i > 0 && modo === 'anual' ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rep.filas.length === 0 ? (
              <tr>
                <td colSpan={rep.columnas.length} className="px-4 py-8 text-center text-slate-400">
                  No hay datos para este período.
                </td>
              </tr>
            ) : (
              rep.filas.map((fila, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {fila.map((celda, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2.5 ${
                        (j > 0 && modo === 'anual') || (j === fila.length - 1 && modo === 'mensual')
                          ? 'text-right tabular'
                          : 'text-slate-700'
                      } ${j === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
