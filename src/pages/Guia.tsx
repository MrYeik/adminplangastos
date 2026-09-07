import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Repeat,
  Landmark,
  HandCoins,
  LayoutDashboard,
  Bell,
  PiggyBank,
  Save,
  CalendarClock,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageShell from '@/components/PageShell'

interface Paso {
  icon: LucideIcon
  color: string
  titulo: string
  detalle: string[]
  to?: string
  toLabel?: string
}

const PASOS: Paso[] = [
  {
    icon: TrendingUp,
    color: 'bg-emerald-50 text-emerald-600',
    titulo: 'Cargá tus ingresos (el sueldo primero)',
    detalle: [
      'Creá el sueldo y tildá "Se repite todos los meses".',
      'Cada mes cargás el importe del recibo (puede variar), subís el recibo y, cuando te depositan, tocás el tilde de "depositado".',
      'Para changas o ingresos únicos, cargalos sin tildar "se repite". Uber o emprendimiento: recurrentes, cargando el total de cada mes.',
    ],
    to: '/ingresos',
    toLabel: 'Ir a Ingresos',
  },
  {
    icon: Receipt,
    color: 'bg-rose-50 text-rose-600',
    titulo: 'Cargá los gastos varios',
    detalle: [
      'Todo lo que pagás fuera de tarjeta: alquiler, súper, impuestos, etc.',
      'Marcá si es fijo o variable, y si se repite todos los meses.',
      'Cada mes podés tildar lo que ya pagaste; arriba ves Total / Pagados / Falta pagar.',
    ],
    to: '/gastos',
    toLabel: 'Ir a Gastos varios',
  },
  {
    icon: CreditCard,
    color: 'bg-amber-50 text-amber-600',
    titulo: 'Creá tus tarjetas y cargá las compras',
    detalle: [
      'Creá cada tarjeta con su día de cierre y su día de vencimiento.',
      'Cargá las compras a mano, o importá el PDF del resumen (elegís a qué mes/resumen corresponde).',
      'Las compras se pagan en el resumen que corresponde: una compra de agosto suele pagarse en el resumen de septiembre.',
    ],
    to: '/tarjetas',
    toLabel: 'Ir a Tarjetas',
  },
  {
    icon: Repeat,
    color: 'bg-cyan-50 text-cyan-600',
    titulo: 'Cargá los servicios',
    detalle: [
      'Débitos recurrentes: Netflix, seguros, gimnasio, etc.',
      'Si el servicio se paga con una tarjeta, marcá la compra como "servicio" desde la tarjeta (no lo cargues dos veces).',
      'Podés registrar aumentos que rigen desde un mes, sin tocar los meses pasados.',
    ],
    to: '/servicios',
    toLabel: 'Ir a Servicios',
  },
  {
    icon: Landmark,
    color: 'bg-indigo-50 text-indigo-600',
    titulo: 'Cargá los préstamos (si tenés)',
    detalle: [
      'Entidad, cantidad de cuotas y valor de la cuota.',
      'Si empezás a pagar meses después, poné el "vencimiento de la 1ª cuota".',
      'En "Ver cuotas" marcás las pagadas por mes y, en los UVA, cargás el valor real de cada cuota cuando llega el recibo.',
    ],
    to: '/prestamos',
    toLabel: 'Ir a Préstamos',
  },
  {
    icon: HandCoins,
    color: 'bg-teal-50 text-teal-600',
    titulo: 'Anotá lo que prestaste (opcional)',
    detalle: [
      'Plata que le prestaste a alguien y te tienen que devolver.',
      'Vas registrando los pagos parciales hasta saldarlo.',
    ],
    to: '/prestado',
    toLabel: 'Ir a Prestado',
  },
  {
    icon: LayoutDashboard,
    color: 'bg-brand-50 text-brand-600',
    titulo: 'Mirá el Dashboard',
    detalle: [
      'Con todo cargado, el panel muestra el ingreso, el gasto y el saldo del mes.',
      'Abajo: total de tarjetas, lo que queda pendiente de pago y lo previsto para el mes que viene.',
      'Usá las flechas de mes (arriba a la derecha) para moverte mes a mes.',
    ],
    to: '/',
    toLabel: 'Ir al Dashboard',
  },
  {
    icon: Bell,
    color: 'bg-orange-50 text-orange-600',
    titulo: 'Revisá recordatorios y calendario',
    detalle: [
      'Recordatorios te avisa los vencimientos próximos de tarjetas, servicios y préstamos.',
      'El calendario muestra todos los movimientos del mes en su día.',
    ],
    to: '/recordatorios',
    toLabel: 'Ir a Recordatorios',
  },
  {
    icon: PiggyBank,
    color: 'bg-violet-50 text-violet-600',
    titulo: 'Analizá: presupuesto, proyección y reportes',
    detalle: [
      'Presupuesto: ponés topes por categoría y ves cómo venís.',
      'Proyección: cómo evoluciona tu disponible los próximos 12 meses.',
      'Reportes: exportás a PDF o Excel.',
    ],
    to: '/proyeccion',
    toLabel: 'Ir a Proyección',
  },
  {
    icon: Save,
    color: 'bg-slate-100 text-slate-600',
    titulo: 'Hacé un backup cada tanto',
    detalle: [
      'Los datos viven en este navegador. En Configuración exportás un backup (.json) para no perderlos.',
      'Guardalo en un lugar seguro; con ese archivo restaurás todo si cambiás de dispositivo.',
    ],
    to: '/configuracion',
    toLabel: 'Ir a Configuración',
  },
]

export default function Guia() {
  return (
    <PageShell titulo="Guía de uso" descripcion="Cómo cargar todo, paso a paso">
      {/* Concepto clave */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <CalendarClock size={20} />
        </span>
        <div className="text-sm text-slate-700">
          <div className="font-semibold text-slate-800">La idea: trabajar mes a mes</div>
          Casi todas las secciones tienen flechas para cambiar de mes. Cargás los ítems una vez
          (los que se repiten aparecen solos cada mes) y mes a mes vas marcando lo{' '}
          <strong>depositado</strong> (ingresos) y lo <strong>pagado</strong> (gastos, servicios,
          tarjetas, préstamos). Así el saldo refleja tu plata real.
        </div>
      </div>

      <ol className="space-y-4">
        {PASOS.map((p, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${p.color}`}>
                <p.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800">{p.titulo}</h3>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                  {p.detalle.map((d, k) => (
                    <li key={k} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {d}
                    </li>
                  ))}
                </ul>
                {p.to && (
                  <Link
                    to={p.to}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                  >
                    {p.toLabel} <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-center text-xs text-slate-400">
        Podés volver a esta guía cuando quieras desde la barra lateral.
      </p>
    </PageShell>
  )
}
