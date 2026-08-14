import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { useConfigStore } from '@/store/configStore'
import { colorCategoria } from '@/lib/colores'

export interface DatoCategoria {
  name: string
  value: number
}

/**
 * Encabezado reutilizable de una sección: importe total del mes + desglose por
 * categoría con un gráfico circular. Se usa en Ingresos, Gastos y Servicios.
 */
export default function ResumenCategorias({
  etiquetaTotal = 'Total del mes',
  total,
  data,
}: {
  etiquetaTotal?: string
  total: number
  data: DatoCategoria[]
}) {
  const money = useConfigStore((s) => s.money)
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col justify-center">
        <div className="text-xs uppercase tracking-wide text-slate-500">{etiquetaTotal}</div>
        <div className="text-3xl font-bold tabular text-slate-900">{money(total)}</div>
        {data.length > 0 && (
          <ul className="mt-3 space-y-1">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorCategoria(i) }} />
                  {d.name}
                </span>
                <span className="tabular text-slate-700">{money(d.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex min-h-[220px] items-center justify-center">
        {data.length === 0 ? (
          <p className="text-sm text-slate-400">Sin datos este mes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={92}
                innerRadius={52}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colorCategoria(i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

/** Agrupa una lista por categoría y devuelve datos ordenados desc para el gráfico. */
export function agruparPorCategoria<T>(
  items: T[],
  categoria: (t: T) => string,
  importe: (t: T) => number,
): DatoCategoria[] {
  const mapa = new Map<string, number>()
  for (const it of items) {
    const v = importe(it)
    if (v <= 0) continue
    const cat = categoria(it) || 'Sin categoría'
    mapa.set(cat, (mapa.get(cat) ?? 0) + v)
  }
  return [...mapa.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
