import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, Landmark, CheckCircle2, Circle, X } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import MonthNav from '@/components/ui/MonthNav'
import SeccionColapsable from '@/components/ui/SeccionColapsable'
import PagadosPorMes from '@/components/ui/PagadosPorMes'
import { Campo, TextInput, Select } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { prestamosRepo } from '@/db/repos/prestamos'
import { useConfigStore } from '@/store/configStore'
import { hoyISO, fechaLegible, etiquetaMes, mesActual, sumarMeses } from '@/lib/dates'
import { resumenPrestamo, mesInicioPrestamo, nroCuotaEnMes, importeCuotaPrestamoEnMes } from '@/lib/cuotas'
import { estaPagado, togglePagoMes } from '@/lib/pagos'
import { agruparPagosPorMes } from '@/lib/historial'
import type { Prestamo } from '@/models'

const VACIO: Omit<Prestamo, 'id'> = {
  entidad: '',
  fecha: hoyISO(),
  capital: 0,
  cantidadCuotas: 12,
  valorCuota: 0,
  cuotaActual: 1,
  observaciones: '',
  tipoAjuste: 'fijo',
  ajusteMensualPct: 0,
}

export default function Prestamos() {
  const money = useConfigStore((s) => s.money)
  const mesRef = mesActual()
  const [mes, setMes] = useState(mesActual())
  const prestamos = useLiveQuery(() => prestamosRepo.todos(), [], [] as Prestamo[])

  const [form, setForm] = useState<Omit<Prestamo, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Prestamo | null>(null)
  const [verCuotasDe, setVerCuotasDe] = useState<Prestamo | null>(null)
  // Edición del valor real de una cuota (mes en edición + importe tipeado).
  const [editCuotaMes, setEditCuotaMes] = useState<string | null>(null)
  const [editValor, setEditValor] = useState(0)

  // Cronograma de un préstamo: una fila por cuota (mes, importe, pagada, si es valor real).
  const cronograma = (p: Prestamo) => {
    const inicio = mesInicioPrestamo(p)
    return Array.from({ length: p.cantidadCuotas }, (_, i) => {
      const mes = sumarMeses(inicio, i)
      return {
        nro: i + 1,
        mes,
        importe: importeCuotaPrestamoEnMes(p, mes),
        pagada: estaPagado(p.mesesPagados, mes),
        esReal: p.valoresReales?.[mes] != null,
      }
    })
  }
  const togglePagoCuota = (p: Prestamo, mes: string) =>
    prestamosRepo.actualizar(p.id!, { mesesPagados: togglePagoMes(p.mesesPagados, mes) })

  // Carga el valor real (del recibo) de una cuota; pisa la estimación de ese mes.
  const guardarValorReal = async (p: Prestamo, mes: string) => {
    if (editValor > 0) {
      await prestamosRepo.actualizar(p.id!, { valoresReales: { ...(p.valoresReales ?? {}), [mes]: editValor } })
    }
    setEditCuotaMes(null)
  }
  // Quita el valor real y vuelve a la estimación.
  const quitarValorReal = async (p: Prestamo, mes: string) => {
    const vr = { ...(p.valoresReales ?? {}) }
    delete vr[mes]
    await prestamosRepo.actualizar(p.id!, { valoresReales: vr })
    setEditCuotaMes(null)
  }

  const nuevo = () => {
    setEditId(null)
    setForm({ ...VACIO, fecha: hoyISO() })
  }
  const editar = (p: Prestamo) => {
    setEditId(p.id!)
    setForm({ ...p })
  }
  const guardar = async () => {
    if (!form || !form.entidad.trim() || form.valorCuota <= 0 || form.cantidadCuotas < 1) return
    const cuotaActual = nroCuotaEnMes(mesInicioPrestamo(form), form.cantidadCuotas, mesRef)
    // Para UVA, la cuota cargada es la del mes actual.
    const mesReferenciaAjuste = form.tipoAjuste === 'uva' ? mesRef : undefined
    const datos = { ...form, cuotaActual, mesReferenciaAjuste }
    if (editId != null) await prestamosRepo.actualizar(editId, datos)
    else await prestamosRepo.agregar(datos)
    setForm(null)
  }

  const totalPendienteGlobal = prestamos.reduce(
    (acc, p) => acc + resumenPrestamo(p, mesRef).totalPendiente,
    0,
  )
  // Préstamos con cuota en el mes navegado (activos ese mes).
  const activosDelMes = prestamos.filter((p) => importeCuotaPrestamoEnMes(p, mes) > 0)
  const cuotasMesTotal = activosDelMes.reduce((a, p) => a + importeCuotaPrestamoEnMes(p, mes), 0)
  // Historial "pagadas por mes": cuotas marcadas como pagadas, agrupadas por mes.
  const pagadosPorMes = agruparPagosPorMes(prestamos, {
    meses: (p) => p.mesesPagados,
    importeEnMes: (p, m) => importeCuotaPrestamoEnMes(p, m),
    descripcion: (p) => p.entidad,
    id: (p, m) => `${p.id}-${m}`,
    detalle: (p, m) => {
      const nro = nroCuotaEnMes(mesInicioPrestamo(p), p.cantidadCuotas, m)
      return nro ? `Cuota ${nro} de ${p.cantidadCuotas}` : undefined
    },
  })

  return (
    <PageShell
      titulo="Préstamos"
      descripcion="Préstamos personales, mes a mes: cuota del mes, activos y pagadas por mes."
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav mes={mes} onCambiar={setMes} />
          <Button onClick={nuevo}>
            <Plus size={18} /> Nuevo préstamo
          </Button>
        </div>
      }
    >
      {prestamos.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total pendiente</div>
            <div className="mt-1 text-xl font-bold text-rose-600 tabular">
              {money(totalPendienteGlobal)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Cuotas · {etiquetaMes(mes)}</div>
            <div className="mt-1 text-xl font-bold text-slate-800 tabular">{money(cuotasMesTotal)}</div>
          </div>
        </div>
      )}

      {prestamos.length === 0 ? (
        <EmptyState
          icon={Landmark}
          titulo="Todavía no hay préstamos"
          descripcion="Cargá un préstamo y el sistema arma el cronograma de cuotas."
          accion={
            <Button onClick={nuevo}>
              <Plus size={18} /> Nuevo préstamo
            </Button>
          }
        />
      ) : (
        <>
        <SeccionColapsable
          titulo={`Activos · ${etiquetaMes(mes)}`}
          subtitulo={<span className="tabular">{money(cuotasMesTotal)}</span>}
        >
          {activosDelMes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
              Ningún préstamo tiene cuota en {etiquetaMes(mes)}. Cambiá de mes con las flechas.
            </p>
          ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium">Cuota</th>
                  <th className="px-4 py-3 text-right font-medium">Valor cuota</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 text-right font-medium">Pendiente</th>
                  <th className="px-4 py-3 font-medium">Finaliza</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {activosDelMes.map((p) => {
                  const r = resumenPrestamo(p, mesRef)
                  const nro = nroCuotaEnMes(mesInicioPrestamo(p), p.cantidadCuotas, mes)
                  const cuotaMes = importeCuotaPrestamoEnMes(p, mes)
                  const pagada = estaPagado(p.mesesPagados, mes)
                  const esReal = p.valoresReales?.[mes] != null
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          {p.entidad}
                          {p.tipoAjuste === 'uva' && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              UVA
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          Capital {money(p.capital)} · {fechaLegible(p.fecha)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {nro} de {p.cantidadCuotas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                        {money(cuotaMes)}
                        {esReal ? (
                          <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] text-emerald-700">real</span>
                        ) : p.tipoAjuste === 'uva' ? (
                          <span className="ml-1 rounded bg-indigo-50 px-1 text-[10px] text-indigo-600" title="Estimado con ajuste UVA">est.</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setVerCuotasDe(p)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${pagada ? 'text-emerald-600' : 'text-slate-400'} hover:bg-slate-100`}
                          title={`Ver y marcar las cuotas por mes (${pagada ? `pagada en ${etiquetaMes(mes)}` : `${etiquetaMes(mes)} pendiente`})`}
                        >
                          {pagada ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          {pagada ? 'Pagada' : 'Pendiente'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                        {money(r.totalPendiente)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.mesFin ? etiquetaMes(r.mesFin) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <BotonAdjuntos entidadTipo="prestamo" entidadId={p.id!} titulo={`Contratos · ${p.entidad}`} />
                          <button
                            onClick={() => editar(p)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                            aria-label="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setABorrar(p)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
        </SeccionColapsable>

        <PagadosPorMes grupos={pagadosPorMes} titulo="Pagadas por mes" tituloPopup="Cuotas pagadas" />
        </>
      )}

      <Modal
        abierto={form != null}
        titulo={editId != null ? 'Editar préstamo' : 'Nuevo préstamo'}
        onCerrar={() => setForm(null)}
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Entidad" requerido>
                <TextInput
                  autoFocus
                  value={form.entidad}
                  onChange={(e) => setForm({ ...form, entidad: e.target.value })}
                  placeholder="Ej: Banco Nación"
                />
              </Campo>
              <Campo label="Fecha de otorgamiento" requerido>
                <TextInput
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </Campo>
            </div>
            <Campo
              label="Vencimiento de la 1ª cuota"
              hint="Si empezás a pagar meses después del otorgamiento. Si lo dejás vacío, arranca el mes del otorgamiento."
            >
              <TextInput
                type="date"
                value={form.fechaPrimeraCuota ?? ''}
                onChange={(e) => setForm({ ...form, fechaPrimeraCuota: e.target.value || undefined })}
              />
            </Campo>
            <Campo label="Capital solicitado">
              <MoneyInput
                value={form.capital}
                onChange={(capital) => setForm({ ...form, capital })}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Cantidad de cuotas" requerido>
                <TextInput
                  type="number"
                  min={1}
                  value={form.cantidadCuotas}
                  onChange={(e) => setForm({ ...form, cantidadCuotas: Number(e.target.value) })}
                />
              </Campo>
              <Campo label={form.tipoAjuste === 'uva' ? 'Cuota actual (este mes)' : 'Valor de cuota'} requerido>
                <MoneyInput
                  value={form.valorCuota}
                  onChange={(valorCuota) => setForm({ ...form, valorCuota })}
                />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Tipo de préstamo">
                <Select
                  value={form.tipoAjuste ?? 'fijo'}
                  onChange={(e) =>
                    setForm({ ...form, tipoAjuste: e.target.value as 'fijo' | 'uva' })
                  }
                >
                  <option value="fijo">Cuota fija</option>
                  <option value="uva">UVA (ajustable)</option>
                </Select>
              </Campo>
              {form.tipoAjuste === 'uva' && (
                <Campo label="Ajuste mensual %" hint="Estimado de suba de la UVA por mes">
                  <TextInput
                    type="number"
                    step="0.1"
                    min={0}
                    value={form.ajusteMensualPct ?? 0}
                    onChange={(e) => setForm({ ...form, ajusteMensualPct: Number(e.target.value) })}
                  />
                </Campo>
              )}
            </div>

            {(() => {
              const preview =
                form.tipoAjuste === 'uva'
                  ? { ...form, mesReferenciaAjuste: form.mesReferenciaAjuste || mesRef }
                  : form
              const r = resumenPrestamo(preview, mesInicioPrestamo(form))
              return (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Total a devolver:{' '}
                  <strong className="text-slate-900">{money(r.totalOriginal)}</strong>
                  {form.tipoAjuste === 'uva' && form.ajusteMensualPct ? (
                    <span className="ml-1 text-slate-400">· estimado con ajuste UVA</span>
                  ) : null}
                  {form.cantidadCuotas >= 1 && form.valorCuota > 0 && (
                    <span className="ml-1 text-slate-400">
                      · finaliza {etiquetaMes(r.mesFin ?? mesInicioPrestamo(form), true)}
                    </span>
                  )}
                </div>
              )
            })()}

            <Campo label="Observaciones">
              <TextInput
                value={form.observaciones ?? ''}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={!form.entidad.trim() || form.valorCuota <= 0 || form.cantidadCuotas < 1}
              >
                {editId != null ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: cuotas por mes (pagadas y pendientes) */}
      <Modal
        abierto={verCuotasDe != null}
        titulo={`Cuotas · ${verCuotasDe?.entidad ?? ''}`}
        onCerrar={() => setVerCuotasDe(null)}
        ancho="max-w-md"
      >
        {verCuotasDe && (() => {
          // Usar la versión viva (para que el tilde de pago se refleje al instante).
          const p = prestamos.find((x) => x.id === verCuotasDe.id) ?? verCuotasDe
          const filas = cronograma(p)
          const pagadas = filas.filter((f) => f.pagada).length
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{filas.length} cuotas · {mesInicioPrestamo(verCuotasDe) && `desde ${etiquetaMes(mesInicioPrestamo(verCuotasDe), true)}`}</span>
                <span className="font-medium text-emerald-600">{pagadas} pagadas</span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
                    {filas.map((f) => {
                      const esPasado = f.mes < mesRef
                      return (
                        <tr key={f.nro} className={`border-b border-slate-100 last:border-0 ${f.pagada ? 'bg-emerald-50/40' : esPasado ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-3 py-2 text-slate-500">Cuota {f.nro}</td>
                          <td className="px-3 py-2 capitalize text-slate-700">
                            {etiquetaMes(f.mes, true)}
                            {f.mes === mes && (
                              <span className="ml-1 rounded bg-brand-50 px-1 text-[10px] font-medium normal-case text-brand-700">
                                este mes
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editCuotaMes === f.mes ? (
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-24">
                                  <MoneyInput value={editValor} onChange={setEditValor} />
                                </div>
                                <button onClick={() => guardarValorReal(p, f.mes)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Guardar valor real">
                                  <CheckCircle2 size={16} />
                                </button>
                                {f.esReal && (
                                  <button onClick={() => quitarValorReal(p, f.mes)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Volver a la estimación">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                <button onClick={() => setEditCuotaMes(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Cancelar">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="tabular text-slate-900">{money(f.importe)}</span>
                                {f.esReal ? (
                                  <span className="rounded bg-emerald-50 px-1 text-[10px] text-emerald-700">real</span>
                                ) : p.tipoAjuste === 'uva' ? (
                                  <span className="rounded bg-indigo-50 px-1 text-[10px] text-indigo-600" title="Estimado con ajuste UVA">est.</span>
                                ) : null}
                                <button
                                  onClick={() => { setEditCuotaMes(f.mes); setEditValor(f.importe) }}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                                  title="Cargar el valor real de esta cuota"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => togglePagoCuota(verCuotasDe, f.mes)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${f.pagada ? 'text-emerald-600' : esPasado ? 'text-rose-500' : 'text-slate-400'} hover:bg-slate-100`}
                              title={f.pagada ? 'Pagada (tocá para desmarcar)' : 'Marcar como pagada'}
                            >
                              {f.pagada ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                              {f.pagada ? 'Pagada' : esPasado ? 'Impaga' : 'Pendiente'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400">
                Impagas anteriores en rojo. Con el lápiz cargás el <strong>valor real</strong> de cada cuota
                (del recibo); pisa la estimación UVA solo de ese mes. La papelera vuelve a la estimación.
              </p>
            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        abierto={aBorrar != null}
        mensaje={`¿Eliminar el préstamo de "${aBorrar?.entidad}"?`}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          if (aBorrar?.id != null) await prestamosRepo.eliminar(aBorrar.id)
          setABorrar(null)
        }}
      />
    </PageShell>
  )
}
