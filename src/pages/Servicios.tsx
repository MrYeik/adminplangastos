import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus,
  Pencil,
  Trash2,
  Repeat,
  TrendingUp,
  CreditCard,
  Ban,
  RotateCcw,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { Campo, TextInput, Select, Checkbox } from '@/components/ui/Form'
import { serviciosRepo } from '@/db/repos/servicios'
import { useConfigStore } from '@/store/configStore'
import { db } from '@/db/db'
import { mesActual, etiquetaMes } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import {
  importeServicioEnMes,
  servicioActivoEnMes,
  importeActual,
  serviciosDelMes,
  importesOrdenados,
} from '@/lib/servicios'
import { gastoAplicaAMes } from '@/lib/agregados'
import { importeCuotaEnMes, mesInicioCompra, cuotasEfectivas } from '@/lib/cuotas'
import type { Servicio, Tarjeta, Gasto, CompraTarjeta } from '@/models'

interface FormState {
  descripcion: string
  categoria: string
  enTarjeta: boolean
  tarjetaId: number | ''
  medioPago: string
  alias: string
  diaVencimiento: number
  importeInicial: number
  mesInicio: string
  observaciones: string
}

const vacio = (categoria: string): FormState => ({
  descripcion: '',
  categoria,
  enTarjeta: false,
  tarjetaId: '',
  medioPago: 'Débito',
  alias: '',
  diaVencimiento: 10,
  importeInicial: 0,
  mesInicio: mesActual(),
  observaciones: '',
})

export default function Servicios() {
  const config = useConfigStore((s) => s.config)
  const mes = mesActual()
  const servicios = useLiveQuery(() => serviciosRepo.todos(), [], [] as Servicio[])
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), [], [] as Tarjeta[])
  // Gastos y compras marcados como "servicio" (se muestran acá sin sumar de nuevo).
  const gastosServicio = useLiveQuery(
    () => db.gastos.filter((g) => !!g.esServicio).toArray(),
    [],
    [] as Gasto[],
  )
  const comprasServicio = useLiveQuery(
    () => db.comprasTarjeta.filter((c) => !!c.esServicio).toArray(),
    [],
    [] as CompraTarjeta[],
  )

  const categorias = config?.categorias ?? []
  const mediosPago = config?.mediosPago ?? []
  const nombreTarjeta = new Map(tarjetas.map((t) => [t.id!, t.nombre]))

  const [form, setForm] = useState<FormState | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [aBorrar, setABorrar] = useState<Servicio | null>(null)
  const [aumentarDe, setAumentarDe] = useState<Servicio | null>(null)
  const [nuevoImporte, setNuevoImporte] = useState(0)
  const [mesAumento, setMesAumento] = useState(mes)

  const nuevo = () => {
    setEditId(null)
    setForm(vacio(categorias[0] ?? 'Servicios'))
  }
  const editar = (s: Servicio) => {
    setEditId(s.id!)
    const primero = importesOrdenados(s)[0]
    setForm({
      descripcion: s.descripcion,
      categoria: s.categoria,
      enTarjeta: s.tarjetaId != null,
      tarjetaId: s.tarjetaId ?? '',
      medioPago: s.medioPago ?? 'Débito',
      alias: s.alias ?? '',
      diaVencimiento: s.diaVencimiento,
      importeInicial: primero?.importe ?? 0,
      mesInicio: primero?.desde ?? mes,
      observaciones: s.observaciones ?? '',
    })
  }

  const guardar = async () => {
    if (!form || !form.descripcion.trim() || form.importeInicial <= 0) return
    if (form.enTarjeta && form.tarjetaId === '') return

    // Preserva los aumentos existentes (todos menos el importe inicial).
    const previos = editId != null ? servicios.find((s) => s.id === editId) : undefined
    const aumentos = previos ? importesOrdenados(previos).slice(1) : []

    const esTransferencia = !form.enTarjeta && form.medioPago === 'Transferencia'
    const datos: Omit<Servicio, 'id'> = {
      descripcion: form.descripcion.trim(),
      categoria: form.categoria,
      tarjetaId: form.enTarjeta ? Number(form.tarjetaId) : undefined,
      medioPago: form.enTarjeta ? undefined : form.medioPago,
      alias: esTransferencia && form.alias.trim() ? form.alias.trim() : undefined,
      diaVencimiento: Math.min(31, Math.max(1, form.diaVencimiento)),
      hasta: previos?.hasta,
      importes: [{ desde: form.mesInicio, importe: form.importeInicial }, ...aumentos],
      observaciones: form.observaciones || undefined,
      mesesPagados: previos?.mesesPagados,
    }
    if (editId != null) await serviciosRepo.actualizar(editId, datos)
    else await serviciosRepo.agregar(datos)
    setForm(null)
  }

  const togglePagado = (s: Servicio) => {
    const pagados = new Set(s.mesesPagados ?? [])
    if (pagados.has(mes)) pagados.delete(mes)
    else pagados.add(mes)
    return serviciosRepo.actualizar(s.id!, { mesesPagados: [...pagados] })
  }

  const registrarAumento = async () => {
    if (!aumentarDe || nuevoImporte <= 0) return
    const importes = [...aumentarDe.importes, { desde: mesAumento, importe: nuevoImporte }]
    await serviciosRepo.actualizar(aumentarDe.id!, { importes })
    setAumentarDe(null)
    setNuevoImporte(0)
  }

  const cambiarEstado = async (s: Servicio) => {
    // Alterna baja/reactivación. Baja = fin este mes.
    await serviciosRepo.actualizar(s.id!, {
      hasta: servicioActivoEnMes(s, mes) ? mes : undefined,
    })
  }

  const totalMensual = serviciosDelMes(servicios, mes)
  const activos = servicios.filter((s) => servicioActivoEnMes(s, mes))
  const enTarjeta = activos.filter((s) => s.tarjetaId != null).length

  return (
    <PageShell
      titulo="Servicios"
      descripcion="Débitos automáticos recurrentes (streaming, seguros, etc.), con aumentos"
      acciones={
        <Button onClick={nuevo}>
          <Plus size={18} /> Nuevo servicio
        </Button>
      }
    >
      {servicios.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total mensual</div>
            <div className="mt-1 text-xl font-bold text-rose-600 tabular">
              {formatMoney(totalMensual)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Activos</div>
            <div className="mt-1 text-xl font-bold text-slate-800 tabular">{activos.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">En tarjeta</div>
            <div className="mt-1 text-xl font-bold text-amber-600 tabular">{enTarjeta}</div>
          </div>
        </div>
      )}

      {servicios.length === 0 ? (
        <EmptyState
          icon={Repeat}
          titulo="No hay servicios cargados"
          descripcion="Cargá tus débitos recurrentes (Netflix, seguro, gimnasio…) y sus aumentos."
          accion={
            <Button onClick={nuevo}>
              <Plus size={18} /> Nuevo servicio
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Medio</th>
                <th className="px-4 py-3 font-medium">Vence</th>
                <th className="px-4 py-3 text-right font-medium">Importe</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => {
                const activo = servicioActivoEnMes(s, mes)
                const vig = activo ? importeServicioEnMes(s, mes) : importeActual(s)
                const tieneAumentos = s.importes.length > 1
                const pagado = (s.mesesPagados ?? []).includes(mes)
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                      !activo ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{s.descripcion}</div>
                      <div className="text-xs text-slate-400">{s.categoria}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.tarjetaId != null ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <CreditCard size={13} /> {nombreTarjeta.get(s.tarjetaId) ?? 'Tarjeta'}
                        </span>
                      ) : (
                        <>
                          <div>{s.medioPago}</div>
                          {s.alias && <div className="text-xs text-slate-400">alias: {s.alias}</div>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">día {s.diaVencimiento}</td>
                    <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                      {formatMoney(vig)}
                      {tieneAumentos && (
                        <span className="ml-1 inline-flex items-center text-emerald-500" title="Con aumentos registrados">
                          <TrendingUp size={12} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {activo ? (
                          <span className="w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            Activo
                          </span>
                        ) : (
                          <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            Baja {s.hasta ? etiquetaMes(s.hasta) : ''}
                          </span>
                        )}
                        {pagado && (
                          <span className="inline-flex w-fit items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            <CheckCircle2 size={11} /> Pagado {etiquetaMes(mes)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {activo && (
                          <button
                            onClick={() => togglePagado(s)}
                            className={`rounded-lg p-1.5 hover:bg-emerald-50 hover:text-emerald-600 ${pagado ? 'text-emerald-600' : 'text-slate-400'}`}
                            aria-label={pagado ? 'Marcar como impago' : 'Marcar como pagado'}
                            title={pagado ? `Pagado en ${etiquetaMes(mes)} (tocá para desmarcar)` : `Marcar pagado en ${etiquetaMes(mes)}`}
                          >
                            {pagado ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                        )}
                        <BotonAdjuntos entidadTipo="servicio" entidadId={s.id!} titulo={`Comprobantes · ${s.descripcion}`} />
                        <button
                          onClick={() => {
                            setAumentarDe(s)
                            setNuevoImporte(importeActual(s))
                            setMesAumento(mes)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          aria-label="Registrar aumento"
                          title="Registrar aumento"
                        >
                          <TrendingUp size={16} />
                        </button>
                        <button
                          onClick={() => cambiarEstado(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={activo ? 'Dar de baja' : 'Reactivar'}
                          title={activo ? 'Dar de baja' : 'Reactivar'}
                        >
                          {activo ? <Ban size={16} /> : <RotateCcw size={16} />}
                        </button>
                        <button
                          onClick={() => editar(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                          aria-label="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setABorrar(s)}
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

      {/* Reflejo: gastos/compras marcados como servicio (no se suman de nuevo) */}
      {(gastosServicio.length > 0 || comprasServicio.length > 0) && (
        <div className="mt-8">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">
            También marcados como servicio
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            Vienen de Gastos y Tarjetas. Se muestran acá para entenderlos, pero{' '}
            <strong>ya están contados</strong> en su sección — no se suman de nuevo.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 text-right font-medium">Este mes</th>
                </tr>
              </thead>
              <tbody>
                {gastosServicio.map((g) => (
                  <tr key={`g${g.id}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{g.descripcion}</div>
                      <div className="text-xs text-slate-400">{g.categoria}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">Gasto</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-slate-700">
                      {formatMoney(gastoAplicaAMes(g, mes) ? g.importe : 0)}
                    </td>
                  </tr>
                ))}
                {comprasServicio.map((c) => (
                  <tr key={`c${c.id}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.descripcion}</div>
                      <div className="text-xs text-slate-400">{c.comercio}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Tarjeta</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular text-slate-700">
                      {formatMoney(
                        importeCuotaEnMes(mesInicioCompra(c), cuotasEfectivas(c), c.importePorCuota, mes),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal alta/edición */}
      <Modal
        abierto={form != null}
        titulo={editId != null ? 'Editar servicio' : 'Nuevo servicio'}
        onCerrar={() => setForm(null)}
      >
        {form && (
          <div className="space-y-4">
            <Campo label="Descripción" requerido>
              <TextInput
                autoFocus
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Netflix, Seguro del auto"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Categoría">
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Campo>
              <Campo label="Día de vencimiento">
                <TextInput
                  type="number"
                  min={1}
                  max={31}
                  value={form.diaVencimiento}
                  onChange={(e) => setForm({ ...form, diaVencimiento: Number(e.target.value) })}
                />
              </Campo>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <Checkbox
                label="Débito automático en una tarjeta de crédito"
                checked={form.enTarjeta}
                onChange={(e) => setForm({ ...form, enTarjeta: e.target.checked })}
              />
              <div className="mt-3">
                {form.enTarjeta ? (
                  tarjetas.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      No tenés tarjetas cargadas. Creá una en la sección Tarjetas.
                    </p>
                  ) : (
                    <Select
                      value={form.tarjetaId}
                      onChange={(e) => setForm({ ...form, tarjetaId: e.target.value === '' ? '' : Number(e.target.value) })}
                    >
                      <option value="">— elegí la tarjeta —</option>
                      {tarjetas.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}{t.banco ? ` (${t.banco})` : ''}</option>
                      ))}
                    </Select>
                  )
                ) : (
                  <Select value={form.medioPago} onChange={(e) => setForm({ ...form, medioPago: e.target.value })}>
                    {mediosPago.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                )}
              </div>
            </div>

            {!form.enTarjeta && form.medioPago === 'Transferencia' && (
              <Campo label="Alias / CBU para la transferencia">
                <TextInput
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                  placeholder="Ej: netflix.mp o el CBU"
                />
              </Campo>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Importe" requerido hint={editId != null ? 'Para subas, usá "registrar aumento"' : undefined}>
                <MoneyInput value={form.importeInicial} onChange={(importeInicial) => setForm({ ...form, importeInicial })} />
              </Campo>
              <Campo label="Desde el mes">
                <TextInput type="month" value={form.mesInicio} onChange={(e) => setForm({ ...form, mesInicio: e.target.value })} />
              </Campo>
            </div>

            <Campo label="Observaciones">
              <TextInput
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setForm(null)}>Cancelar</Button>
              <Button
                onClick={guardar}
                disabled={!form.descripcion.trim() || form.importeInicial <= 0 || (form.enTarjeta && form.tarjetaId === '')}
              >
                {editId != null ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal registrar aumento */}
      <Modal
        abierto={aumentarDe != null}
        titulo={`Registrar aumento · ${aumentarDe?.descripcion ?? ''}`}
        onCerrar={() => setAumentarDe(null)}
        ancho="max-w-sm"
      >
        {aumentarDe && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Importe actual: <strong className="tabular text-slate-900">{formatMoney(importeActual(aumentarDe))}</strong>
            </div>
            <Campo label="Nuevo importe" requerido>
              <MoneyInput value={nuevoImporte} onChange={setNuevoImporte} autoFocus />
            </Campo>
            <Campo label="Rige desde el mes">
              <TextInput type="month" value={mesAumento} onChange={(e) => setMesAumento(e.target.value)} />
            </Campo>
            {aumentarDe.importes.length > 1 && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="mb-1 font-medium text-slate-600">Historial</div>
                <ul className="space-y-0.5 text-slate-500">
                  {importesOrdenados(aumentarDe).map((iv, i) => (
                    <li key={i} className="flex justify-between">
                      <span>desde {etiquetaMes(iv.desde)}</span>
                      <span className="tabular">{formatMoney(iv.importe)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setAumentarDe(null)}>Cancelar</Button>
              <Button onClick={registrarAumento} disabled={nuevoImporte <= 0}>Registrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={aBorrar != null}
        mensaje={`¿Eliminar el servicio "${aBorrar?.descripcion}"?`}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          if (aBorrar?.id != null) await serviciosRepo.eliminar(aBorrar.id)
          setABorrar(null)
        }}
      />
    </PageShell>
  )
}
