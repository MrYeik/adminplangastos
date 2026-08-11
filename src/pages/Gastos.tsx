import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, Receipt, Repeat, CheckCircle2, Circle } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import MonthNav from '@/components/ui/MonthNav'
import { Campo, TextInput, Select, Checkbox } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { gastosRepo } from '@/db/repos/gastos'
import { useConfigStore } from '@/store/configStore'
import { gastoAplicaAMes } from '@/lib/agregados'
import { estaPagado, togglePagoMes } from '@/lib/pagos'
import { hoyISO, fechaLegible, mesActual } from '@/lib/dates'
import type { Gasto, TipoGasto } from '@/models'

const VACIO: Omit<Gasto, 'id'> = {
  descripcion: '',
  categoria: 'Vivienda',
  fecha: hoyISO(),
  importe: 0,
  medioPago: 'Efectivo',
  responsable: '',
  observaciones: '',
  repetitivoMensual: false,
  tipo: 'fijo',
}

const BADGE_TIPO: Record<TipoGasto, string> = {
  fijo: 'bg-indigo-50 text-indigo-700',
  variable: 'bg-amber-50 text-amber-700',
}

export default function Gastos() {
  const money = useConfigStore((s) => s.money)
  const config = useConfigStore((s) => s.config)
  const gastos = useLiveQuery(() => gastosRepo.todos(), [], [] as Gasto[])

  const [form, setForm] = useState<Omit<Gasto, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Gasto | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoGasto>('todos')
  const [mes, setMes] = useState(mesActual())

  const categorias = config?.categorias ?? []
  const mediosPago = config?.mediosPago ?? []

  const togglePagado = (g: Gasto) =>
    gastosRepo.actualizar(g.id!, { mesesPagados: togglePagoMes(g.mesesPagados, mes) })

  const abrirNuevo = () => {
    setEditId(null)
    setForm({ ...VACIO, fecha: hoyISO(), categoria: categorias[0] ?? 'Otros' })
  }
  const abrirEditar = (g: Gasto) => {
    setEditId(g.id!)
    setForm({ ...g })
  }
  const cerrar = () => setForm(null)

  const guardar = async () => {
    if (!form || !form.descripcion.trim() || form.importe <= 0) return
    if (editId != null) await gastosRepo.actualizar(editId, form)
    else await gastosRepo.agregar(form)
    cerrar()
  }

  // Gastos que corresponden al mes seleccionado (recurrentes + los del mes).
  const gastosDelMes = gastos.filter((g) => gastoAplicaAMes(g, mes))
  const visibles = gastosDelMes.filter((g) => filtroTipo === 'todos' || g.tipo === filtroTipo)
  const total = gastosDelMes.reduce((a, g) => a + g.importe, 0)
  const pagado = gastosDelMes
    .filter((g) => estaPagado(g.mesesPagados, mes))
    .reduce((a, g) => a + g.importe, 0)
  const falta = total - pagado

  return (
    <PageShell
      titulo="Gastos"
      descripcion="Lo gastado, pagado y lo que falta pagar, mes a mes"
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav mes={mes} onCambiar={setMes} />
          <Button onClick={abrirNuevo}>
            <Plus size={18} /> Nuevo gasto
          </Button>
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-3 gap-4 sm:max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-xl font-bold text-slate-800 tabular">{money(total)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Pagados</div>
          <div className="mt-1 text-xl font-bold text-emerald-600 tabular">{money(pagado)}</div>
        </div>
        <div className={`rounded-xl border p-4 ${falta > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
          <div className="text-xs text-slate-500">Falta pagar</div>
          <div className={`mt-1 text-xl font-bold tabular ${falta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {money(falta)}
          </div>
        </div>
      </div>

      {gastosDelMes.length > 0 && (
        <div className="mb-3 flex gap-1">
          {(['todos', 'fijo', 'variable'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                filtroTipo === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'fijo' ? 'Fijos' : 'Variables'}
            </button>
          ))}
        </div>
      )}

      {gastosDelMes.length === 0 ? (
        <EmptyState
          icon={Receipt}
          titulo="Sin gastos este mes"
          descripcion="No hay gastos para el mes seleccionado."
          accion={
            <Button onClick={abrirNuevo}>
              <Plus size={18} /> Nuevo gasto
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((g) => {
                const gpagado = estaPagado(g.mesesPagados, mes)
                return (
                <tr key={g.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${gpagado ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePagado(g)}
                      className={`rounded-lg p-1 hover:bg-emerald-50 hover:text-emerald-600 ${gpagado ? 'text-emerald-600' : 'text-slate-300'}`}
                      aria-label={gpagado ? 'Marcar impago' : 'Marcar pagado'}
                      title={gpagado ? 'Pagado (tocá para desmarcar)' : 'Marcar como pagado'}
                    >
                      {gpagado ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      {g.descripcion}
                      {g.repetitivoMensual && <Repeat size={13} className="text-brand-500" />}
                      {g.esServicio && (
                        <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-700">
                          servicio
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {[g.medioPago, g.responsable].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{g.categoria}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${BADGE_TIPO[g.tipo]}`}
                    >
                      {g.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fechaLegible(g.fecha)}</td>
                  <td className="px-4 py-3 text-right font-medium text-rose-600 tabular">
                    {money(g.importe)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <BotonAdjuntos entidadTipo="gasto" entidadId={g.id!} titulo={`Comprobantes · ${g.descripcion}`} />
                      <button
                        onClick={() => abrirEditar(g)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setABorrar(g)}
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
        titulo={editId != null ? 'Editar gasto' : 'Nuevo gasto'}
        onCerrar={cerrar}
      >
        {form && (
          <div className="space-y-4">
            <Campo label="Descripción" requerido>
              <TextInput
                autoFocus
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Alquiler"
              />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Categoría">
                <Select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Tipo" requerido>
                <Select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoGasto })}
                >
                  <option value="fijo">Fijo</option>
                  <option value="variable">Variable</option>
                </Select>
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Importe" requerido>
                <MoneyInput
                  value={form.importe}
                  onChange={(importe) => setForm({ ...form, importe })}
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

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Medio de pago">
                <Select
                  value={form.medioPago}
                  onChange={(e) => setForm({ ...form, medioPago: e.target.value })}
                >
                  {mediosPago.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Responsable">
                <TextInput
                  value={form.responsable ?? ''}
                  onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                  placeholder="Opcional"
                />
              </Campo>
            </div>

            <Checkbox
              label="Se repite todos los meses"
              checked={form.repetitivoMensual}
              onChange={(e) => setForm({ ...form, repetitivoMensual: e.target.checked })}
            />

            <Checkbox
              label="Es un servicio (mostrarlo también en la pestaña Servicios)"
              checked={form.esServicio ?? false}
              onChange={(e) => setForm({ ...form, esServicio: e.target.checked })}
            />

            <Campo label="Observaciones">
              <TextInput
                value={form.observaciones ?? ''}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={cerrar}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={!form.descripcion.trim() || form.importe <= 0}>
                {editId != null ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={aBorrar != null}
        mensaje={`¿Eliminar el gasto "${aBorrar?.descripcion}"?`}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          if (aBorrar?.id != null) await gastosRepo.eliminar(aBorrar.id)
          setABorrar(null)
        }}
      />
    </PageShell>
  )
}
