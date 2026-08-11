import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import PageShell from '@/components/PageShell'
import MonthNav from '@/components/ui/MonthNav'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { eventosDelMes, ESTILO_TIPO, type EventoFinanciero, type TipoEvento } from '@/lib/eventos'
import { conteoPagoServicios, pendientePagoServicios } from '@/lib/servicios'
import { serviciosRepo } from '@/db/repos/servicios'
import { mesActual, diasDelMes, primerDiaSemana, diaDeFecha, etiquetaMes, hoyISO } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function Calendario() {
  const datos = useDatosFinancieros()
  const [mes, setMes] = useState(mesActual())

  const togglePagoServicio = async (id: number) => {
    const s = (datos.servicios ?? []).find((x) => x.id === id)
    if (!s) return
    const pagados = new Set(s.mesesPagados ?? [])
    if (pagados.has(mes)) pagados.delete(mes)
    else pagados.add(mes)
    await serviciosRepo.actualizar(id, { mesesPagados: [...pagados] })
  }

  const conteoServicios = conteoPagoServicios(datos.servicios ?? [], mes)
  const pendienteServicios = pendientePagoServicios(datos.servicios ?? [], mes)

  const eventos = eventosDelMes(datos, mes)
  const porDia = new Map<number, EventoFinanciero[]>()
  for (const e of eventos) {
    const d = diaDeFecha(e.fecha)
    if (!porDia.has(d)) porDia.set(d, [])
    porDia.get(d)!.push(e)
  }

  const totalDias = diasDelMes(mes)
  const offset = primerDiaSemana(mes)
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const hoy = mesActual() === mes ? diaDeFecha(hoyISO()) : -1

  // Tipos presentes (para la leyenda)
  const tiposPresentes = Array.from(new Set(eventos.map((e) => e.tipo)))

  return (
    <PageShell
      titulo="Calendario financiero"
      descripcion="Sueldos, tarjetas, préstamos, servicios e impuestos del mes"
      acciones={<MonthNav mes={mes} onCambiar={setMes} />}
    >
      {/* Leyenda */}
      <div className="mb-4 flex flex-wrap gap-3">
        {(Object.keys(ESTILO_TIPO) as TipoEvento[])
          .filter((t) => tiposPresentes.includes(t))
          .map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: ESTILO_TIPO[t].dot }} />
              {ESTILO_TIPO[t].label}
            </span>
          ))}
        {tiposPresentes.length === 0 && (
          <span className="text-xs text-slate-400">Sin movimientos este mes.</span>
        )}
      </div>

      {/* Resumen de servicios pagados / pendientes */}
      {conteoServicios.total > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-slate-700">
            Servicios pagados: <strong>{conteoServicios.pagados} de {conteoServicios.total}</strong>
          </span>
          {pendienteServicios > 0 ? (
            <span className="text-slate-500">
              · pendiente <strong className="tabular text-rose-600">{formatMoney(pendienteServicios)}</strong>
            </span>
          ) : (
            <span className="text-emerald-600">· todo al día 🎉</span>
          )}
        </div>
      )}

      {/* Grilla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            const evs = dia ? porDia.get(dia) ?? [] : []
            const esHoy = dia === hoy
            return (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 ${
                  dia ? '' : 'bg-slate-50/50'
                }`}
              >
                {dia && (
                  <>
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        esHoy ? 'bg-brand-600 font-semibold text-white' : 'text-slate-500'
                      }`}
                    >
                      {dia}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, 3).map((e, j) => (
                        <div
                          key={j}
                          className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] ${e.pagado ? 'opacity-60' : ''}`}
                          style={{ background: `${ESTILO_TIPO[e.tipo].dot}1a` }}
                          title={`${e.titulo} · ${formatMoney(e.importe)}${e.pagado ? ' · pagado' : ''}`}
                        >
                          {e.pagado ? (
                            <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
                          ) : (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: ESTILO_TIPO[e.tipo].dot }}
                            />
                          )}
                          <span className={`truncate text-slate-700 ${e.pagado ? 'line-through' : ''}`}>
                            {e.titulo}
                          </span>
                        </div>
                      ))}
                      {evs.length > 3 && (
                        <div className="px-1 text-[11px] text-slate-400">+{evs.length - 3} más</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detalle / centro de obligaciones del mes */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-800">
          Obligaciones y movimientos de {etiquetaMes(mes, true)}
        </h2>
        {eventos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No hay movimientos registrados para este mes.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eventos.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-10 flex-col items-center justify-center rounded-lg text-xs"
                    style={{ background: `${ESTILO_TIPO[e.tipo].dot}1a`, color: ESTILO_TIPO[e.tipo].dot }}
                  >
                    <span className="font-bold leading-none">{diaDeFecha(e.fecha)}</span>
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      <span className={e.pagado ? 'text-slate-400 line-through' : ''}>{e.titulo}</span>
                      {e.pagado && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          <CheckCircle2 size={10} /> Pagado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className={`rounded px-1.5 py-0.5 ${ESTILO_TIPO[e.tipo].chip}`}>
                        {ESTILO_TIPO[e.tipo].label}
                      </span>
                      {e.detalle ? ` · ${e.detalle}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-medium tabular ${
                      e.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'
                    } ${e.pagado ? 'text-slate-400' : ''}`}
                  >
                    {e.tipo === 'ingreso' ? '+' : ''}
                    {formatMoney(e.importe)}
                  </span>
                  {e.servicioId != null && (
                    <button
                      onClick={() => togglePagoServicio(e.servicioId!)}
                      className={`rounded-lg p-1 hover:bg-emerald-50 hover:text-emerald-600 ${e.pagado ? 'text-emerald-600' : 'text-slate-300'}`}
                      aria-label={e.pagado ? 'Marcar impago' : 'Marcar pagado'}
                      title={e.pagado ? 'Pagado (tocá para desmarcar)' : 'Marcar como pagado'}
                    >
                      {e.pagado ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
