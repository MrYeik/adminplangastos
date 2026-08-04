import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, TrendingUp, Repeat } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput, Checkbox } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { ingresosRepo } from '@/db/repos/ingresos'
import { useConfigStore } from '@/store/configStore'
import { hoyISO, fechaLegible } from '@/lib/dates'
import type { Ingreso } from '@/models'

const CATEGORIAS_SUGERIDAS = [
  'Sueldo',
  'Horas extras',
  'Aguinaldo',
  'Trabajo adicional',
  'Otros ingresos',
]

const VACIO: Omit<Ingreso, 'id'> = {
  descripcion: '',
  categoria: 'Sueldo',
  fecha: hoyISO(),
  importe: 0,
  repeticionMensual: false,
  observaciones: '',
}

export default function Ingresos() {
  const money = useConfigStore((s) => s.money)
  const ingresos = useLiveQuery(() => ingresosRepo.todos(), [], [] as Ingreso[])

  const [form, setForm] = useState<Omit<Ingreso, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Ingreso | null>(null)

  const abrirNuevo = () => {
    setEditId(null)
    setForm({ ...VACIO, fecha: hoyISO() })
  }
  const abrirEditar = (i: Ingreso) => {
    setEditId(i.id!)
    setForm({ ...i })
  }
  const cerrar = () => setForm(null)

  const guardar = async () => {
    if (!form || !form.descripcion.trim() || form.importe <= 0) return
    if (editId != null) await ingresosRepo.actualizar(editId, form)
    else await ingresosRepo.agregar(form)
    cerrar()
  }

  const total = ingresos.reduce((acc, i) => acc + i.importe, 0)
  const totalMensualRecurrenteMes = ingresos
    .filter((i) => i.repeticionMensual)
    .reduce((acc, i) => acc + i.importe, 0)

  return (
    <PageShell
      titulo="Ingresos"
      descripcion="Sueldos, aguinaldo, horas extra y otros ingresos"
      acciones={
        <Button onClick={abrirNuevo}>
          <Plus size={18} /> Nuevo ingreso
        </Button>
      }
    >
      {ingresos.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total registrado</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 tabular">{money(total)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Recurrente mensual</div>
            <div className="mt-1 text-xl font-bold text-slate-800 tabular">
              {money(totalMensualRecurrenteMes)}
            </div>
          </div>
        </div>
      )}

      {ingresos.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          titulo="Todavía no hay ingresos"
          descripcion="Cargá tu sueldo y otros ingresos para empezar."
          accion={
            <Button onClick={abrirNuevo}>
              <Plus size={18} /> Nuevo ingreso
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 font-medium">Mensual</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{i.descripcion}</div>
                    {i.observaciones && (
                      <div className="text-xs text-slate-400">{i.observaciones}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.categoria}</td>
                  <td className="px-4 py-3 text-slate-600">{fechaLegible(i.fecha)}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600 tabular">
                    {money(i.importe)}
                  </td>
                  <td className="px-4 py-3">
                    {i.repeticionMensual ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                        <Repeat size={12} /> Sí
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <BotonAdjuntos entidadTipo="ingreso" entidadId={i.id!} titulo={`Comprobantes · ${i.descripcion}`} />
                      <button
                        onClick={() => abrirEditar(i)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setABorrar(i)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        abierto={form != null}
        titulo={editId != null ? 'Editar ingreso' : 'Nuevo ingreso'}
        onCerrar={cerrar}
      >
        {form && (
          <div className="space-y-4">
            <Campo label="Descripción" requerido>
              <TextInput
                autoFocus
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Sueldo de julio"
              />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Categoría">
                <TextInput
                  list="cat-ingresos"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
                <datalist id="cat-ingresos">
                  {CATEGORIAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Campo>
              <Campo label="Fecha" requerido>
                <TextInput
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </Campo>
            </div>

            <Campo label="Importe" requerido>
              <MoneyInput
                value={form.importe}
                onChange={(importe) => setForm({ ...form, importe })}
              />
            </Campo>

            <Checkbox
              label="Se repite todos los meses"
              checked={form.repeticionMensual}
              onChange={(e) => setForm({ ...form, repeticionMensual: e.target.checked })}
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
              <Button
                onClick={guardar}
                disabled={!form.descripcion.trim() || form.importe <= 0}
              >
                {editId != null ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={aBorrar != null}
        mensaje={`¿Eliminar el ingreso "${aBorrar?.descripcion}"?`}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          if (aBorrar?.id != null) await ingresosRepo.eliminar(aBorrar.id)
          setABorrar(null)
        }}
      />
    </PageShell>
  )
}
