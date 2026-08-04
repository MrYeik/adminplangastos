import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  Receipt,
  Wallet,
  CreditCard,
  AlertTriangle,
  PiggyBank,
  CalendarClock,
  Landmark,
  Repeat,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import {
  resumenMes,
  serieMensual,
  egresosPorCategoria,
  deudaPendiente,
  proximosVencimientos,
} from '@/lib/agregados'
import { mesActual, ventanaMeses, etiquetaMes } from '@/lib/dates'
import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { colorCategoria } from '@/lib/colores'
import type { LucideIcon } from 'lucide-react'

function Kpi({
  label,
  valor,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  valor: string
  icon: LucideIcon
  color: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon className={color} size={20} />
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 tabular">{valor}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Panel({
  titulo,
  children,
  className = '',
}: {
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <h2 className="mb-4 font-semibold text-slate-800">{titulo}</h2>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const mes = mesActual()

  const r = resumenMes(datos, mes)
  const deuda = deudaPendiente(datos.compras, datos.prestamos, mes)
  const tasaAhorro = r.ingresos > 0 ? Math.round((r.disponible / r.ingresos) * 100) : 0

  const ventana = ventanaMeses(config?.mesInicioProyeccion ?? mes, 12)
  const serie = serieMensual(datos, ventana)
  const serieChart = serie.map((s) => ({
    mes: etiquetaMes(s.mes),
    Ingresos: s.ingresos,
    Egresos: s.egresos,
    Disponible: s.disponible,
  }))

  const distribucion = egresosPorCategoria(datos, mes).map((d) => ({
    name: d.categoria,
    value: d.total,
  }))

  const vencimientos = proximosVencimientos(datos.compras, datos.prestamos, mes).slice(0, 6)

  const hayDatos =
    datos.ingresos.length > 0 ||
    datos.gastos.length > 0 ||
    datos.compras.length > 0 ||
    datos.prestamos.length > 0 ||
    (datos.servicios?.length ?? 0) > 0

  const tooltipMoney = (v: number | string) => formatMoney(Number(v))

  return (
    <PageShell
      titulo="Dashboard"
      descripcion={`Panorama de ${etiquetaMes(mes, true)}`}
    >
      {!hayDatos ? (
        <EmptyState
          icon={Wallet}
          titulo="Todavía no hay datos"
          descripcion="Cargá ingresos, gastos, tarjetas o préstamos y el panel se arma solo."
        />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Ingreso mensual" valor={formatMoney(r.ingresos)} icon={TrendingUp} color="text-emerald-600" />
            <Kpi label="Gastos del mes" valor={formatMoney(r.gastos)} icon={Receipt} color="text-rose-600" sub={`Fijos ${formatMoney(r.gastosFijos)} · Variables ${formatMoney(r.gastosVariables)}`} />
            <Kpi label="Comprometido en cuotas" valor={formatMoney(r.cuotas)} icon={CreditCard} color="text-amber-600" sub={`Tarjetas ${formatMoney(r.cuotasTarjeta)} · Préstamos ${formatMoney(r.cuotasPrestamo)}`} />
            <Kpi label="Servicios del mes" valor={formatMoney(r.servicios)} icon={Repeat} color="text-cyan-600" sub="Débitos automáticos recurrentes" />
            <Kpi label="Disponible" valor={formatMoney(r.disponible)} icon={Wallet} color={r.disponible >= 0 ? 'text-brand-600' : 'text-rose-600'} sub="Ingresos − gastos − cuotas − servicios" />
            <Kpi label="Deuda pendiente" valor={formatMoney(deuda)} icon={AlertTriangle} color="text-orange-600" sub="Total a pagar (tarjetas + préstamos)" />
            <Kpi label="Capacidad de ahorro" valor={`${tasaAhorro}%`} icon={PiggyBank} color="text-indigo-600" sub={`${formatMoney(r.disponible)} del ingreso`} />
          </div>

          {/* Distribución + próximos vencimientos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel titulo={`Distribución de egresos · ${etiquetaMes(mes)}`}>
              {distribucion.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">
                  Sin egresos este mes.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={distribucion}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {distribucion.map((_, i) => (
                        <Cell key={i} fill={colorCategoria(i)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipMoney} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel titulo="Próximos vencimientos">
              {vencimientos.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">
                  No hay cuotas pendientes.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {vencimientos.map((v, i) => (
                    <li key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-lg p-2 ${
                            v.tipo === 'tarjeta'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-indigo-50 text-indigo-600'
                          }`}
                        >
                          {v.tipo === 'tarjeta' ? <CreditCard size={16} /> : <Landmark size={16} />}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{v.descripcion}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <CalendarClock size={12} /> {etiquetaMes(v.mes, true)}
                          </div>
                        </div>
                      </div>
                      <span className="font-medium tabular text-slate-900">
                        {formatMoney(v.importe)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* Ingresos vs egresos */}
          <Panel titulo="Ingresos vs. egresos (12 meses)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serieChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(v) => formatMoneyCompact(Number(v))}
                  width={70}
                />
                <Tooltip formatter={tooltipMoney} />
                <Legend />
                <Bar dataKey="Ingresos" fill="#0d9488" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Evolución del disponible */}
          <Panel titulo="Evolución del disponible (12 meses)">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={serieChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-disp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(v) => formatMoneyCompact(Number(v))}
                  width={70}
                />
                <Tooltip formatter={tooltipMoney} />
                <Area
                  type="monotone"
                  dataKey="Disponible"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#grad-disp)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}
    </PageShell>
  )
}
