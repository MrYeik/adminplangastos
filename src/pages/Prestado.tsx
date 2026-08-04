import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, HandCoins, CircleDollarSign } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput } from '@/components/ui/Form'
import { prestadosRepo } from '@/db/repos/prestados'
import { useConfigStore } from '@/store/configStore'
import { hoyISO, fechaLegible } from '@/lib/dates'
import { saldoPrestado, totalPagado, estadoDerivado } from '@/lib/prestado'
import type { Prestado, EstadoPrestado, PagoParcial } from '@/models'

const VACIO: Omit<Prestado, 'id'> = {
  persona: '',
  concepto: '',
  importe: 0,
  fecha: hoyISO(),
  estado: 'pendiente',
  pagos: [],
}

const BADGE_ESTADO: Record<EstadoPrestado, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  parcial: 'bg-blue-50 text-blue-700',
  cancelado: 'bg-emerald-50 text-emerald-700',
}
const LABEL_ESTADO: Record<EstadoPrestado, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
}

export default function Prestado() {
  const money = useConfigStore((s) => s.money)
  const prestados = useLiveQuery(() => prestadosRepo.todos(), [], [] as Prestado[])

  const [form, setForm] = useState<Omit<Prestado, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Prestado | null>(null)
  const [pagoDe, setPagoDe] = useState<Prestado | null>(null)
  const [montoPago, setMontoPago] = useState(0)

  const nuevo = () => {
    setEditId(null)
    setForm({ ...VACIO, fecha: hoyISO(), pagos: [] })
  }
  const editar = (p: Prestado) => {
    setEditId(p.id!)
    setForm({ ...p })
  }
  const guardar = async () => {
    if (!form || !form.persona.trim() || form.importe <= 0) return
    const datos = { ...form, estado: estadoDerivado(form) }
    if (editId != null) await prestadosRepo.actualizar(editId, datos)
    else await prestadosRepo.agregar(datos)
    setForm(null)
  }

  const registrarPago = async () => {
    if (!pagoDe || montoPago <= 0) return
    const pago: PagoParcial = { fecha: hoyISO(), importe: montoPago }
    const pagos = [...(pagoDe.pagos ?? []), pago]
    await prestadosRepo.actualizar(pagoDe.id!, {
      pagos,
      estado: estadoDerivado({ importe: pagoDe.importe, pagos }),
    })
    setPagoDe(null)
    setMontoPago(0)
  }

  const totalPorCobrar = prestados.reduce((acc, p) => acc + saldoPrestado(p), 0)

  return (
    <PageShell
      titulo="Prestado"
      descripcion="Dinero prestado a otras personas, con pagos parciales."
      acciones={
        <Button onClick={nuevo}>
          <Plus size={18} /> Nuevo préstamo
        </Button>
      }
    >
      {prestados.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total por cobrar</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 tabular">
              {money(totalPorCobrar)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Registros activos</div>
            <div className="mt-1 text-xl font-bold text-slate-800 tabular">
              {prestados.filter((p) => saldoPrestado(p) > 0).length}
            </div>
          </div>
        </div>
      )}

      {prestados.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          titulo="No hay préstamos a personas"
          descripcion="Registrá dinero que prestaste y seguí los pagos."
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
                <th className="px-4 py-3 font-medium">Persona</th>
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 text-right font-medium">Pagado</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {prestados.map((p) => {
                const estado = estadoDerivado(p)
                const saldo = saldoPrestado(p)
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{p.persona}</div>
                      <div className="text-xs text-slate-400">{fechaLegible(p.fecha)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.concepto || '—'}</td>
                    <td className="px-4 py-3 text-right tabular text-slate-700">
                      {money(p.importe)}
                    </td>
                    <td className="px-4 py-3 text-right tabular text-slate-500">
                      {money(totalPagado(p))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                      {money(saldo)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${BADGE_ESTADO[estado]}`}
                      >
                        {LABEL_ESTADO[estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {saldo > 0 && (
                          <button
                            onClick={() => {
                              setPagoDe(p)
                              setMontoPago(0)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label="Registrar pago"
                            title="Registrar pago"
                          >
                            <CircleDollarSign size={16} />
                          </button>
                        )}
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

      {/* Modal alta/edición */}
      <Modal
        abierto={form != null}
        titulo={editId != null ? 'Editar préstamo' : 'Nuevo préstamo'}
        onCerrar={() => setForm(null)}
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Persona" requerido>
                <TextInput
                  autoFocus
                  value={form.persona}
                  onChange={(e) => setForm({ ...form, persona: e.target.value })}
                  placeholder="Ej: Juan"
                />
              </Campo>
              <Campo label="Fecha" requerido>
                <TextInput
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </Campo>
            </div>
            <Campo label="Concepto">
              <TextInput
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                placeholder="Ej: Le presté para el auto"
              />
            </Campo>
            <Campo label="Importe" requerido>
              <MoneyInput value={form.importe} onChange={(importe) => setForm({ ...form, importe })} />
            </Campo>
            {(form.pagos?.length ?? 0) > 0 && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="mb-1 font-medium text-slate-700">Pagos registrados</div>
                <ul className="space-y-0.5 text-slate-600">
                  {form.pagos!.map((pg, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{fechaLegible(pg.fecha)}</span>
                      <span className="tabular">{money(pg.importe)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={!form.persona.trim() || form.importe <= 0}>
                {editId != null ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal registrar pago */}
      <Modal
        abierto={pagoDe != null}
        titulo={`Registrar pago de ${pagoDe?.persona ?? ''}`}
        onCerrar={() => setPagoDe(null)}
        ancho="max-w-sm"
      >
        {pagoDe && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Saldo actual:{' '}
              <strong className="text-slate-900 tabular">{money(saldoPrestado(pagoDe))}</strong>
            </div>
            <Campo label="Monto del pago" requerido>
              <MoneyInput value={montoPago} onChange={setMontoPago} autoFocus />
            </Campo>
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setPagoDe(null)}>
                Cancelar
              </Button>
              <Button onClick={registrarPago} disabled={montoPago <= 0}>
                Registrar pago
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={aBorrar != null}
        mensaje={`¿Eliminar el registro de "${aBorrar?.persona}"?`}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          if (aBorrar?.id != null) await prestadosRepo.eliminar(aBorrar.id)
          setABorrar(null)
        }}
      />
    </PageShell>
  )
}
