import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Trash2, TrendingUp, Repeat, ArrowUpDown, CheckCircle2, Circle } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput, Checkbox } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import MonthNav from '@/components/ui/MonthNav'
import ResumenCategorias, { agruparPorCategoria } from '@/components/ResumenCategorias'
import { ingresosRepo } from '@/db/repos/ingresos'
import { useConfigStore } from '@/store/configStore'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { ingresoAplicaAMes, saldoArrastrado } from '@/lib/agregados'
import { importeVigenteEnMes } from '@/lib/vigencia'
import { estaPagado, togglePagoMes } from '@/lib/pagos'
import { hoyISO, fechaLegible, mesActual, etiquetaMes, fechaConDia, diaDeFecha } from '@/lib/dates'
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
  const config = useConfigStore((s) => s.config)
  const datos = useDatosFinancieros()
  const ingresos = useLiveQuery(() => ingresosRepo.todos(), [], [] as Ingreso[])

  const [form, setForm] = useState<Omit<Ingreso, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Ingreso | null>(null)
  const [mes, setMes] = useState(mesActual())
  // Cambio de importe a futuro (sin tocar meses pasados)
  const [cambiarDe, setCambiarDe] = useState<Ingreso | null>(null)
  const [nuevoImporte, setNuevoImporte] = useState(0)
  const [mesCambio, setMesCambio] = useState(mes)

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

  const abrirCambio = (i: Ingreso) => {
    setCambiarDe(i)
    setNuevoImporte(importeVigenteEnMes(i.importe, i.importes, mes))
    setMesCambio(mes)
  }
  const guardarCambio = async () => {
    if (!cambiarDe || nuevoImporte <= 0) return
    // Un cambio con 'desde' = mes del alta pisa el importe base; si no, se suma al historial.
    const desdeAlta = mesCambio <= cambiarDe.fecha.slice(0, 7)
    if (desdeAlta) {
      await ingresosRepo.actualizar(cambiarDe.id!, { importe: nuevoImporte })
    } else {
      const importes = [
        ...(cambiarDe.importes ?? []).filter((x) => x.desde !== mesCambio),
        { desde: mesCambio, importe: nuevoImporte },
      ]
      await ingresosRepo.actualizar(cambiarDe.id!, { importes })
    }
    setCambiarDe(null)
  }

  // Ingresos que aplican al mes elegido (recurrentes + los del mes).
  const ingresosDelMes = ingresos.filter((i) => ingresoAplicaAMes(i, mes))
  const importeMes = (i: Ingreso) => importeVigenteEnMes(i.importe, i.importes, mes)
  const totalBase = ingresosDelMes.reduce((acc, i) => acc + importeMes(i), 0)

  // Saldo libre arrastrado del mes anterior (cuenta corriente), como ingreso.
  const mesInicio = config?.mesInicioProyeccion ?? mes
  const arrastre = saldoArrastrado(datos, mes, mesInicio)
  const total = totalBase + arrastre

  const porCategoria = agruparPorCategoria(ingresosDelMes, (i) => i.categoria, importeMes)
  const datosPie = arrastre > 0 ? [{ name: 'Saldo mes anterior', value: arrastre }, ...porCategoria] : porCategoria
  const hayFilas = ingresosDelMes.length > 0 || arrastre !== 0

  // Cobrado (depositado) vs a cobrar (pendiente) del mes.
  const depositadoMes = ingresosDelMes
    .filter((i) => estaPagado(i.mesesCobrado, mes))
    .reduce((a, i) => a + importeMes(i), 0)
  const cobrado = arrastre + depositadoMes // plata ya disponible (arrastre + lo depositado)
  const aCobrar = totalBase - depositadoMes // ingresos del mes que faltan depositarse
  const toggleCobrado = (i: Ingreso) =>
    ingresosRepo.actualizar(i.id!, { mesesCobrado: togglePagoMes(i.mesesCobrado, mes) })
  // Fecha estimada de un ingreso en el mes navegado (recurrente = el día, en este mes).
  const fechaEstimada = (i: Ingreso) =>
    i.repeticionMensual ? fechaConDia(mes, diaDeFecha(i.fecha)) : i.fecha

  return (
    <PageShell
      titulo="Ingresos"
      descripcion="Sueldos, aguinaldo, horas extra y otros ingresos, mes a mes"
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav mes={mes} onCambiar={setMes} />
          <Button onClick={abrirNuevo}>
            <Plus size={18} /> Nuevo ingreso
          </Button>
        </div>
      }
    >
      <ResumenCategorias etiquetaTotal={`Total ingresos · ${etiquetaMes(mes)}`} total={total} data={datosPie} />

      {hayFilas && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Cobrado (disponible)</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 tabular">{money(cobrado)}</div>
          </div>
          <div className={`rounded-xl border p-4 ${aCobrar > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="text-xs text-slate-500">A cobrar</div>
            <div className={`mt-1 text-xl font-bold tabular ${aCobrar > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {money(aCobrar)}
            </div>
          </div>
        </div>
      )}

      {!hayFilas ? (
        <EmptyState
          icon={TrendingUp}
          titulo="Sin ingresos este mes"
          descripcion="No hay ingresos para el mes seleccionado."
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
                <th className="px-4 py-3 font-medium">Cobro</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estimado</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 font-medium">Mensual</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {arrastre !== 0 && (
                <tr className="border-b border-slate-100 bg-emerald-50/40">
                  <td className="px-4 py-3 text-emerald-600" title="Ya disponible">
                    <CheckCircle2 size={18} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">Saldo del mes anterior</div>
                    <div className="text-xs text-slate-400">Lo que quedó libre y se arrastra</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">Saldo</td>
                  <td className="px-4 py-3 text-slate-400">—</td>
                  <td className={`px-4 py-3 text-right font-medium tabular ${arrastre >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {money(arrastre)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      automático
                    </span>
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              )}
              {ingresosDelMes.map((i) => {
                const cobradoI = estaPagado(i.mesesCobrado, mes)
                return (
                <tr key={i.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${cobradoI ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleCobrado(i)}
                      className={`rounded-lg p-1 hover:bg-emerald-50 hover:text-emerald-600 ${cobradoI ? 'text-emerald-600' : 'text-slate-300'}`}
                      aria-label={cobradoI ? 'Marcar como no cobrado' : 'Marcar como cobrado/depositado'}
                      title={cobradoI ? `Depositado en ${etiquetaMes(mes)} (tocá para desmarcar)` : `Marcar depositado en ${etiquetaMes(mes)}`}
                    >
                      {cobradoI ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{i.descripcion}</div>
                    {i.observaciones && (
                      <div className="text-xs text-slate-400">{i.observaciones}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.categoria}</td>
                  <td className="px-4 py-3 text-slate-600">{fechaLegible(fechaEstimada(i))}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600 tabular">
                    {money(importeMes(i))}
                    {(i.importes?.length ?? 0) > 0 && (
                      <span className="ml-1 inline-flex items-center text-emerald-500" title="Con cambios de importe">
                        <ArrowUpDown size={12} />
                      </span>
                    )}
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
                      {i.repeticionMensual && (
                        <button
                          onClick={() => abrirCambio(i)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          aria-label="Cambiar importe desde un mes"
                          title="Cambiar importe (desde un mes, sin tocar el pasado)"
                        >
                          <ArrowUpDown size={16} />
                        </button>
                      )}
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
                )
              })}
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

      {/* Modal: cambiar importe desde un mes (sin afectar el pasado) */}
      <Modal
        abierto={cambiarDe != null}
        titulo={`Cambiar importe · ${cambiarDe?.descripcion ?? ''}`}
        onCerrar={() => setCambiarDe(null)}
        ancho="max-w-sm"
      >
        {cambiarDe && (
          <div className="space-y-4">
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              El nuevo importe rige <strong>desde el mes elegido en adelante</strong>. Los meses
              anteriores mantienen el valor que tenían.
            </p>
            <Campo label="Nuevo importe" requerido>
              <MoneyInput value={nuevoImporte} onChange={setNuevoImporte} />
            </Campo>
            <Campo label="Rige desde el mes">
              <TextInput
                type="month"
                value={mesCambio}
                onChange={(e) => setMesCambio(e.target.value)}
              />
            </Campo>
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setCambiarDe(null)}>
                Cancelar
              </Button>
              <Button onClick={guardarCambio} disabled={nuevoImporte <= 0}>
                Guardar
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
