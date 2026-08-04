import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Ingresos from '@/pages/Ingresos'
import Gastos from '@/pages/Gastos'
import Tarjetas from '@/pages/Tarjetas'
import Prestamos from '@/pages/Prestamos'
import Prestado from '@/pages/Prestado'
import Servicios from '@/pages/Servicios'
import Presupuesto from '@/pages/Presupuesto'
import Proyeccion from '@/pages/Proyeccion'
import Escenarios from '@/pages/Escenarios'
import Calendario from '@/pages/Calendario'
import Recordatorios from '@/pages/Recordatorios'
import Busquedas from '@/pages/Busquedas'
import Configuracion from '@/pages/Configuracion'

// Páginas con dependencias pesadas (jspdf, xlsx) → se cargan bajo demanda.
const Reportes = lazy(() => import('@/pages/Reportes'))
const Importar = lazy(() => import('@/pages/Importar'))

function Cargando() {
  return <div className="p-8 text-sm text-slate-400">Cargando…</div>
}

const lazyEl = (Comp: React.ComponentType) => (
  <Suspense fallback={<Cargando />}>
    <Comp />
  </Suspense>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'ingresos', element: <Ingresos /> },
      { path: 'gastos', element: <Gastos /> },
      { path: 'tarjetas', element: <Tarjetas /> },
      { path: 'prestamos', element: <Prestamos /> },
      { path: 'prestado', element: <Prestado /> },
      { path: 'servicios', element: <Servicios /> },
      { path: 'calendario', element: <Calendario /> },
      { path: 'presupuesto', element: <Presupuesto /> },
      { path: 'proyeccion', element: <Proyeccion /> },
      { path: 'escenarios', element: <Escenarios /> },
      { path: 'reportes', element: lazyEl(Reportes) },
      { path: 'busquedas', element: <Busquedas /> },
      { path: 'recordatorios', element: <Recordatorios /> },
      { path: 'configuracion', element: <Configuracion /> },
      { path: 'importar', element: lazyEl(Importar) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
