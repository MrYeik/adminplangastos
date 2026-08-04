import PageShell from '@/components/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import { BellRing, BellOff, CalendarClock } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { obligacionesProximas, ESTILO_TIPO, type Recordatorio } from '@/lib/eventos'
import { hoyISO, fechaLegible } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const HORIZONTE_DIAS = 30

interface Urgencia {
  clase: string
  borde: string
  etiqueta: string
}

function urgencia(dias: number): Urgencia {
  const etiqueta = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`
  if (dias <= 1) return { clase: 'bg-rose-100 text-rose-700', borde: 'border-l-rose-500', etiqueta }
  if (dias <= 2) return { clase: 'bg-orange-100 text-orange-700', borde: 'border-l-orange-500', etiqueta }
  if (dias <= 5) return { clase: 'bg-amber-100 text-amber-700', borde: 'border-l-amber-500', etiqueta }
  if (dias <= 10) return { clase: 'bg-yellow-100 text-yellow-800', borde: 'border-l-yellow-500', etiqueta }
  return { clase: 'bg-slate-100 text-slate-600', borde: 'border-l-slate-300', etiqueta }
}

export default function Recordatorios() {
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const umbralMax = Math.max(...(config?.notificacionDias ?? [10]))

  const proximas = obligacionesProximas(datos, hoyISO(), HORIZONTE_DIAS)
  const urgentes = proximas.filter((r) => r.diasRestantes <= umbralMax)
  const totalUrgente = urgentes.reduce((a, r) => a + r.importe, 0)

  const renderItem = (r: Recordatorio, i: number) => {
    const u = urgencia(r.diasRestantes)
    const est = ESTILO_TIPO[r.tipo]
    return (
      <li
        key={i}
        className={`flex items-center justify-between border-l-4 ${u.borde} bg-white px-4 py-3`}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: `${est.dot}1a`, color: est.dot }}
          >
            <CalendarClock size={18} />
          </span>
          <div>
            <div className="text-sm font-medium text-slate-800">{r.titulo}</div>
            <div className="text-xs text-slate-400">
              <span className={`rounded px-1.5 py-0.5 ${est.chip}`}>{est.label}</span>
              {' · '}
              {fechaLegible(r.fecha)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium tabular text-slate-900">{formatMoney(r.importe)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.clase}`}>
            {u.etiqueta}
          </span>
        </div>
      </li>
    )
  }

  return (
    <PageShell
      titulo="Recordatorios"
      descripcion={`Vencimientos de tarjetas, préstamos, servicios e impuestos · avisos a ${(
        config?.notificacionDias ?? [10, 5, 2, 1]
      ).join('/')} días`}
    >
      {proximas.length === 0 ? (
        <EmptyState
          icon={BellOff}
          titulo="No hay vencimientos próximos"
          descripcion={`Nada por pagar en los próximos ${HORIZONTE_DIAS} días.`}
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div
            className={`flex items-center gap-4 rounded-xl border p-5 ${
              urgentes.length > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                urgentes.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <BellRing size={24} />
            </span>
            <div>
              <div className="text-lg font-bold text-slate-900">
                {urgentes.length > 0
                  ? `${urgentes.length} ${
                      urgentes.length === 1 ? 'obligación' : 'obligaciones'
                    } en los próximos ${umbralMax} días`
                  : 'Sin vencimientos urgentes'}
              </div>
              {urgentes.length > 0 && (
                <div className="text-sm text-slate-600">
                  Total a pagar: <strong className="tabular">{formatMoney(totalUrgente)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Urgentes */}
          {urgentes.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Próximos {umbralMax} días
              </h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {urgentes.map(renderItem)}
              </ul>
            </div>
          )}

          {/* Más adelante */}
          {proximas.length > urgentes.length && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Más adelante (hasta {HORIZONTE_DIAS} días)
              </h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 opacity-80">
                {proximas.filter((r) => r.diasRestantes > umbralMax).map(renderItem)}
              </ul>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
