import { NavLink, Outlet } from 'react-router-dom'
import { useRecordatorios } from '@/store/useRecordatorios'
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  CreditCard,
  Landmark,
  HandCoins,
  Repeat,
  CalendarDays,
  Wallet,
  BarChart3,
  FlaskConical,
  FileText,
  Search,
  Bell,
  Settings,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/prestamos', label: 'Préstamos', icon: Landmark },
  { to: '/prestado', label: 'Prestado', icon: HandCoins },
  { to: '/servicios', label: 'Servicios', icon: Repeat },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/presupuesto', label: 'Presupuesto', icon: Wallet },
  { to: '/proyeccion', label: 'Proyección', icon: BarChart3 },
  { to: '/escenarios', label: 'Escenarios', icon: FlaskConical },
  { to: '/reportes', label: 'Reportes', icon: FileText },
  { to: '/busquedas', label: 'Búsquedas', icon: Search },
  { to: '/recordatorios', label: 'Recordatorios', icon: Bell },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function Layout() {
  const recordatorios = useRecordatorios()

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-xl font-bold text-white tracking-tight">GASTOS</div>
          <div className="text-xs text-slate-400">Finanzas del hogar</div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const badge = to === '/recordatorios' ? recordatorios.length : 0
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="px-5 py-3 text-[11px] text-slate-500 border-t border-slate-800">
          v0.1 · datos locales
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  )
}
