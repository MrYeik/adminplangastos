import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, CreditCard, ShoppingBag, CalendarClock, FileUp } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import { tarjetasRepo, comprasRepo } from '@/db/repos/tarjetas'
import { serviciosRepo } from '@/db/repos/servicios'
import { useConfigStore } from '@/store/configStore'
import { hoyISO, fechaLegible, etiquetaMes, mesActual } from '@/lib/dates'
import { resumenCompra, mesInicioCompra, nroCuotaEnMes } from '@/lib/cuotas'
import { serviciosDeTarjetaEnMes } from '@/lib/servicios'
import type { Tarjeta, CompraTarjeta, Servicio } from '@/models'

const COLORES = [
  '#0d9488', '#4f46e5', '#db2777', '#ea580c', '#0891b2',
  '#9333ea', '#dc2626', '#16a34a', '#ca8a04', '#475569',
]

const TARJETA_VACIA: Omit<Tarjeta, 'id'> = { nombre: '', banco: '', color: COLORES[0] }
const COMPRA_VACIA: Omit<CompraTarjeta, 'id' | 'tarjetaId'> = {
  descripcion: '',
  fechaCompra: hoyISO(),
  comercio: '',
  cantidadCuotas: 1,
  cuotaActual: 1,
  importePorCuota: 0,
  observaciones: '',
}

export default function Tarjetas() {
  const money = useConfigStore((s) => s.money)
  const config = useConfigStore((s) => s.config)
  const mesRef = mesActual()

  const tarjetas = useLiveQuery(() => tarjetasRepo.todas(), [], [] as Tarjeta[])
  const compras = useLiveQuery(() => comprasRepo.todas(), [], [] as CompraTarjeta[])
  const servicios = useLiveQuery(() => serviciosRepo.todos(), [], [] as Servicio[])

  const [seleccionada, setSeleccionada] = useState<number | null>(null)

  // Formularios de tarjeta
  const [formTarjeta, setFormTarjeta] = useState<Omit<Tarjeta, 'id'> | null>(null)
  const [editTarjetaId, setEditTarjetaId] = useState<number | null>(null)
  const [tarjetaABorrar, setTarjetaABorrar] = useState<Tarjeta | null>(null)

  // Formularios de compra
  const [formCompra, setFormCompra] = useState<Omit<CompraTarjeta, 'id' | 'tarjetaId'> | null>(null)
  const [editCompraId, setEditCompraId] = useState<number | null>(null)
  const [compraABorrar, setCompraABorrar] = useState<CompraTarjeta | null>(null)

  const bancos = config?.bancos ?? []

  // Total pendiente comprometido por tarjeta (desde el mes actual)
  const pendientePorTarjeta = (tarjetaId: number) =>
    compras
      .filter((c) => c.tarjetaId === tarjetaId)
      .reduce((acc, c) => acc + resumenCompra(c, mesRef).totalPendiente, 0)

  const tarjetaSel = tarjetas.find((t) => t.id === seleccionada) ?? null
  const comprasSel = compras.filter((c) => c.tarjetaId === seleccionada)

  // --- acciones tarjeta ---
  const nuevaTarjeta = () => {
    setEditTarjetaId(null)
    setFormTarjeta({ ...TARJETA_VACIA })
  }
  const editarTarjeta = (t: Tarjeta) => {
    setEditTarjetaId(t.id!)
    setFormTarjeta({ nombre: t.nombre, banco: t.banco, color: t.color })
  }
  const guardarTarjeta = async () => {
    if (!formTarjeta || !formTarjeta.nombre.trim()) return
    if (editTarjetaId != null) await tarjetasRepo.actualizar(editTarjetaId, formTarjeta)
    else {
      const id = await tarjetasRepo.agregar(formTarjeta)
      setSeleccionada(id as number)
    }
    setFormTarjeta(null)
  }

  // --- acciones compra ---
  const nuevaCompra = () => {
    setEditCompraId(null)
    setFormCompra({ ...COMPRA_VACIA, fechaCompra: hoyISO() })
  }
  const editarCompra = (c: CompraTarjeta) => {
    setEditCompraId(c.id!)
    const { id: _id, tarjetaId: _t, ...resto } = c
    setFormCompra(resto)
  }
  const guardarCompra = async () => {
    if (!formCompra || seleccionada == null) return
    if (!formCompra.descripcion.trim() || formCompra.importePorCuota <= 0 || formCompra.cantidadCuotas < 1)
      return
    // cuotaActual como snapshot informativo respecto del mes actual
    const cuotaActual = nroCuotaEnMes(
      mesInicioCompra(formCompra),
      formCompra.cantidadCuotas,
      mesRef,
    )
    const datos = { ...formCompra, cuotaActual, tarjetaId: seleccionada }
    if (editCompraId != null) await comprasRepo.actualizar(editCompraId, datos)
    else await comprasRepo.agregar(datos)
    setFormCompra(null)
  }

  return (
    <PageShell
      titulo="Tarjetas"
      descripcion="Compras en cuotas por tarjeta. Las cuotas se generan y vencen solas."
      acciones={
        <div className="flex gap-2">
          <Link to="/importar-resumen">
            <Button variante="secondary">
              <FileUp size={16} /> Importar resumen PDF
            </Button>
          </Link>
          <Button onClick={nuevaTarjeta}>
            <Plus size={18} /> Nueva tarjeta
          </Button>
        </div>
      }
    >
      {tarjetas.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          titulo="Todavía no hay tarjetas"
          descripcion="Creá una tarjeta (Visa, Naranja, etc.) para cargar sus compras."
          accion={
            <Button onClick={nuevaTarjeta}>
              <Plus size={18} /> Nueva tarjeta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map((t) => {
            const pendiente = pendientePorTarjeta(t.id!)
            const activas = compras.filter(
              (c) => c.tarjetaId === t.id && resumenCompra(c, mesRef).activa,
            ).length
            const debitos = serviciosDeTarjetaEnMes(servicios, t.id!, mesRef)
            return (
              <button
                key={t.id}
                onClick={() => setSeleccionada(t.id!)}
                className={`rounded-xl p-5 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 ${
                  seleccionada === t.id ? 'ring-2 ring-offset-2 ring-slate-800' : ''
                }`}
                style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)` }}
              >
                <div className="flex items-start justify-between">
                  <CreditCard size={28} className="opacity-90" />
                  <div className="flex gap-1">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        editarTarjeta(t)
                      }}
                      className="rounded p-1 hover:bg-white/20"
                      aria-label="Editar tarjeta"
                    >
                      <Pencil size={15} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTarjetaABorrar(t)
                      }}
                      className="rounded p-1 hover:bg-white/20"
                      aria-label="Eliminar tarjeta"
                    >
                      <Trash2 size={15} />
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-lg font-semibold">{t.nombre}</div>
                {t.banco && <div className="text-sm opacity-80">{t.banco}</div>}
                <div className="mt-4 border-t border-white/25 pt-3">
                  <div className="text-xs opacity-80">Comprometido pendiente</div>
                  <div className="text-xl font-bold tabular">{money(pendiente)}</div>
                  <div className="text-xs opacity-80">
                    {activas} {activas === 1 ? 'compra activa' : 'compras activas'}
                  </div>
                  {debitos > 0 && (
                    <div className="mt-1 text-xs opacity-90">
                      + {money(debitos)}/mes en débitos automáticos
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {tarjetaSel && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: tarjetaSel.color }}
              />
              Compras de {tarjetaSel.nombre}
            </h2>
            <Button onClick={nuevaCompra}>
              <Plus size={18} /> Nueva compra
            </Button>
          </div>

          {comprasSel.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              titulo="Sin compras cargadas"
              descripcion="Agregá una compra en cuotas y el sistema arma el cronograma."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Compra</th>
                    <th className="px-4 py-3 font-medium">Cuota</th>
                    <th className="px-4 py-3 text-right font-medium">Por cuota</th>
                    <th className="px-4 py-3 text-right font-medium">Pendiente</th>
                    <th className="px-4 py-3 font-medium">Próx. venc.</th>
                    <th className="px-4 py-3 font-medium">Finaliza</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {comprasSel.map((c) => {
                    const r = resumenCompra(c, mesRef)
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                          !r.activa ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{c.descripcion}</div>
                          <div className="text-xs text-slate-400">
                            {[c.comercio, fechaLegible(c.fechaCompra)].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {r.activa ? `${r.cuotaActual} de ${r.cantidadCuotas}` : 'Finalizada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-slate-700">
                          {money(c.importePorCuota)}
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
                            <BotonAdjuntos entidadTipo="compra" entidadId={c.id!} titulo={`Comprobantes · ${c.descripcion}`} />
                            <button
                              onClick={() => editarCompra(c)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                              aria-label="Editar compra"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setCompraABorrar(c)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Eliminar compra"
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
        </div>
      )}

      {/* Modal tarjeta */}
      <Modal
        abierto={formTarjeta != null}
        titulo={editTarjetaId != null ? 'Editar tarjeta' : 'Nueva tarjeta'}
        onCerrar={() => setFormTarjeta(null)}
        ancho="max-w-md"
      >
        {formTarjeta && (
          <div className="space-y-4">
            <Campo label="Nombre" requerido>
              <TextInput
                autoFocus
                value={formTarjeta.nombre}
                onChange={(e) => setFormTarjeta({ ...formTarjeta, nombre: e.target.value })}
                placeholder="Ej: Visa, Naranja, Nativa"
              />
            </Campo>
            <Campo label="Banco / emisor">
              <TextInput
                list="bancos-list"
                value={formTarjeta.banco ?? ''}
                onChange={(e) => setFormTarjeta({ ...formTarjeta, banco: e.target.value })}
                placeholder="Opcional"
              />
              <datalist id="bancos-list">
                {bancos.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Color">
              <div className="flex flex-wrap gap-2">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormTarjeta({ ...formTarjeta, color: c })}
                    className={`h-8 w-8 rounded-full transition ${
                      formTarjeta.color === c ? 'ring-2 ring-offset-2 ring-slate-800' : ''
                    }`}
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </Campo>
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setFormTarjeta(null)}>
                Cancelar
              </Button>
              <Button onClick={guardarTarjeta} disabled={!formTarjeta.nombre.trim()}>
                {editTarjetaId != null ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal compra */}
      <Modal
        abierto={formCompra != null}
        titulo={editCompraId != null ? 'Editar compra' : 'Nueva compra'}
        onCerrar={() => setFormCompra(null)}
      >
        {formCompra && (
          <div className="space-y-4">
            <Campo label="Descripción" requerido>
              <TextInput
                autoFocus
                value={formCompra.descripcion}
                onChange={(e) => setFormCompra({ ...formCompra, descripcion: e.target.value })}
                placeholder="Ej: TV 55 pulgadas"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Comercio">
                <TextInput
                  value={formCompra.comercio ?? ''}
                  onChange={(e) => setFormCompra({ ...formCompra, comercio: e.target.value })}
                  placeholder="Opcional"
                />
              </Campo>
              <Campo label="Fecha de compra" requerido>
                <TextInput
                  type="date"
                  value={formCompra.fechaCompra}
                  onChange={(e) => setFormCompra({ ...formCompra, fechaCompra: e.target.value })}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Cantidad de cuotas" requerido>
                <TextInput
                  type="number"
                  min={1}
                  value={formCompra.cantidadCuotas}
                  onChange={(e) =>
                    setFormCompra({ ...formCompra, cantidadCuotas: Number(e.target.value) })
                  }
                />
              </Campo>
              <Campo label="Importe por cuota" requerido>
                <MoneyInput
                  value={formCompra.importePorCuota}
                  onChange={(importePorCuota) => setFormCompra({ ...formCompra, importePorCuota })}
                />
              </Campo>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Total de la compra:{' '}
              <strong className="text-slate-900">
                {money(formCompra.cantidadCuotas * formCompra.importePorCuota)}
              </strong>
              {formCompra.cantidadCuotas >= 1 && formCompra.importePorCuota > 0 && (
                <span className="ml-1 text-slate-400">
                  · finaliza{' '}
                  {etiquetaMes(
                    resumenCompra(formCompra, mesRef).mesFin ?? mesInicioCompra(formCompra),
                    true,
                  )}
                </span>
              )}
            </div>

            <Campo label="Observaciones">
              <TextInput
                value={formCompra.observaciones ?? ''}
                onChange={(e) => setFormCompra({ ...formCompra, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setFormCompra(null)}>
                Cancelar
              </Button>
              <Button
                onClick={guardarCompra}
                disabled={
                  !formCompra.descripcion.trim() ||
                  formCompra.importePorCuota <= 0 ||
                  formCompra.cantidadCuotas < 1
                }
              >
                {editCompraId != null ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={tarjetaABorrar != null}
        mensaje={`¿Eliminar la tarjeta "${tarjetaABorrar?.nombre}" y todas sus compras?`}
        onCancelar={() => setTarjetaABorrar(null)}
        onConfirmar={async () => {
          if (tarjetaABorrar?.id != null) {
            await tarjetasRepo.eliminar(tarjetaABorrar.id)
            if (seleccionada === tarjetaABorrar.id) setSeleccionada(null)
          }
          setTarjetaABorrar(null)
        }}
      />

      <ConfirmDialog
        abierto={compraABorrar != null}
        mensaje={`¿Eliminar la compra "${compraABorrar?.descripcion}"?`}
        onCancelar={() => setCompraABorrar(null)}
        onConfirmar={async () => {
          if (compraABorrar?.id != null) await comprasRepo.eliminar(compraABorrar.id)
          setCompraABorrar(null)
        }}
      />
    </PageShell>
  )
}
