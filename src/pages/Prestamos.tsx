import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, Landmark, CalendarClock } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput, Select } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { prestamosRepo } from '@/db/repos/prestamos'
import { useConfigStore } from '@/store/configStore'
import { hoyISO, fechaLegible, etiquetaMes, mesActual } from '@/lib/dates'
import { resumenPrestamo, mesInicioPrestamo, nroCuotaEnMes } from '@/lib/cuotas'
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
  const prestamos = useLiveQuery(() => prestamosRepo.todos(), [], [] as Prestamo[])

  const [form, setForm] = useState<Omit<Prestamo, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Prestamo | null>(null)

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
  const activos = prestamos.filter((p) => resumenPrestamo(p, mesRef).activa).length

  return (
    <PageShell
      titulo="Préstamos"
      descripcion="Préstamos personales. El sistema calcula cuotas restantes y saldo."
      acciones={
        <Button onClick={nuevo}>
          <Plus size={18} /> Nuevo préstamo
        </Button>
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
            <div className="text-xs text-slate-500">Préstamos activos</div>
            <div className="mt-1 text-xl font-bold text-slate-800 tabular">{activos}</div>
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Entidad</th>
                <th className="px-4 py-3 font-medium">Cuota</th>
                <th className="px-4 py-3 text-right font-medium">Valor cuota</th>
                <th className="px-4 py-3 text-right font-medium">Pendiente</th>
                <th className="px-4 py-3 font-medium">Próx. venc.</th>
                <th className="px-4 py-3 font-medium">Finaliza</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {prestamos.map((p) => {
                const r = resumenPrestamo(p, mesRef)
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                      !r.activa ? 'opacity-50' : ''
                    }`}
                  >
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
                        {r.activa ? `${r.cuotaActual} de ${r.cantidadCuotas}` : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-slate-700">
                      {money(p.valorCuota)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                      {money(r.totalPendiente)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.proximoVencimiento ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={13} className="text-amber-500" />
                          {etiquetaMes(r.proximoVencimiento)}
                        </span>
                      ) : (
                        '—'
                      )}
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
