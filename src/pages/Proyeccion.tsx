import { useState } from 'react'
import PageShell from '@/components/PageShell'
import MonthNav from '@/components/ui/MonthNav'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { serieMensual, type ResumenMes } from '@/lib/agregados'
import { ventanaMeses, etiquetaMes, mesActual } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface Fila {
  label: string
  campo: keyof ResumenMes
  clase?: string
  destacar?: boolean
}

const FILAS: Fila[] = [
  { label: 'Ingresos', campo: 'ingresos', clase: 'text-emerald-700' },
  { label: 'Gastos fijos', campo: 'gastosFijos' },
  { label: 'Gastos variables', campo: 'gastosVariables' },
  { label: 'Cuotas de tarjetas', campo: 'cuotasTarjeta' },
  { label: 'Cuotas de préstamos', campo: 'cuotasPrestamo' },
  { label: 'Servicios', campo: 'servicios' },
  { label: 'Total egresos', campo: 'egresos', clase: 'text-rose-700', destacar: true },
  { label: 'Saldo del mes', campo: 'disponible', destacar: true },
]

export default function Proyeccion() {
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const [inicio, setInicio] = useState('')

  const mesInicio = inicio || config?.mesInicioProyeccion || mesActual()
  const meses = ventanaMeses(mesInicio, 12)
  const serie = serieMensual(datos, meses)

  const totalFila = (campo: keyof ResumenMes) =>
    serie.reduce((a, s) => a + (s[campo] as number), 0)

  return (
    <PageShell
      titulo="Proyección anual"
      descripcion="12 meses desde el mes de inicio. Se recalcula sola con tus datos."
      acciones={<MonthNav mes={mesInicio} onCambiar={setInicio} />}
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">
                Concepto
              </th>
              {meses.map((m) => (
                <th
                  key={m}
                  className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide"
                >
                  {etiquetaMes(m)}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map((fila) => (
              <tr
                key={fila.campo}
                className={`border-b border-slate-100 last:border-0 ${
                  fila.destacar ? 'bg-slate-50/60 font-semibold' : ''
                }`}
              >
                <td
                  className={`sticky left-0 z-10 px-4 py-2.5 text-left ${
                    fila.destacar ? 'bg-slate-50 font-semibold' : 'bg-white'
                  } ${fila.clase ?? 'text-slate-700'}`}
                >
                  {fila.label}
                </td>
                {serie.map((s) => {
                  const valor = s[fila.campo] as number
                  const negativo = fila.campo === 'disponible' && valor < 0
                  return (
                    <td
                      key={s.mes}
                      className={`px-3 py-2.5 text-right tabular ${
                        negativo ? 'text-rose-600' : fila.clase ?? 'text-slate-700'
                      }`}
                    >
                      {valor !== 0 ? formatMoney(valor) : <span className="text-slate-300">—</span>}
                    </td>
                  )
                })}
                <td
                  className={`px-4 py-2.5 text-right tabular font-semibold ${
                    fila.campo === 'disponible' && totalFila(fila.campo) < 0
                      ? 'text-rose-700'
                      : fila.clase ?? 'text-slate-900'
                  }`}
                >
                  {formatMoney(totalFila(fila.campo))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Las cuotas de tarjetas y préstamos aparecen solo en los meses en que están vigentes y
        desaparecen al terminar. Los ingresos y gastos marcados como mensuales se repiten en cada mes.
      </p>
    </PageShell>
  )
}
