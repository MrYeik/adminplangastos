import { useState } from 'react'
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
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/guia', label: 'Guía de uso', icon: BookOpen },
  { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos varios', icon: Receipt },
  { to: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/servicios', label: 'Servicios', icon: Repeat },
  { to: '/prestamos', label: 'Préstamos', icon: Landmark },
  { to: '/prestado', label: 'Prestado', icon: HandCoins },
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
  const [menuAbierto, setMenuAbierto] = useState(false)

  const cerrarMenu = () => setMenuAbierto(false)

  return (
    <div className="flex min-h-screen">
      {/* Fondo oscuro al abrir el menú en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={cerrarMenu}
          aria-hidden
        />
      )}

      {/* Barra lateral: fija/deslizante en móvil, estática en escritorio */}
      <aside
        className={`fixed inset-y-0 z-40 flex w-60 shrink-0 flex-col bg-slate-900 text-slate-200 transition-[left] duration-200 md:static md:left-0 md:z-auto ${
          menuAbierto ? 'left-0' : '-left-60'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              Aura<span className="text-brand-400">+</span>
            </div>
            <div className="text-xs text-slate-400">Finanzas del Hogar</div>
          </div>
          <button
            type="button"
            onClick={cerrarMenu}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const badge = to === '/recordatorios' ? recordatorios.length : 0
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={cerrarMenu}
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
        <div className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">
          v0.1 · datos locales
        </div>
      </aside>

      {/* Columna de contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en móvil */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="text-lg font-bold tracking-tight text-slate-900">
            Aura<span className="text-brand-500">+</span>
          </div>
          {recordatorios.length > 0 && (
            <NavLink
              to="/recordatorios"
              onClick={cerrarMenu}
              className="ml-auto flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
            >
              <Bell size={14} />
              {recordatorios.length}
            </NavLink>
          )}
        </header>

        <main className="flex-1 overflow-x-auto pb-[env(safe-area-inset-bottom)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
