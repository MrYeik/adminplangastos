import { Fragment, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  ShoppingBag,
  CalendarClock,
  FileUp,
  Ban,
  Layers,
  Repeat,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import MoneyInput from '@/components/ui/MoneyInput'
import { Campo, TextInput, Select, Checkbox } from '@/components/ui/Form'
import BotonAdjuntos from '@/components/BotonAdjuntos'
import MonthNav from '@/components/ui/MonthNav'
import { tarjetasRepo, comprasRepo } from '@/db/repos/tarjetas'
import { serviciosRepo } from '@/db/repos/servicios'
import { useConfigStore } from '@/store/configStore'
import {
  hoyISO,
  fechaLegible,
  etiquetaMes,
  mesActual,
  periodoResumen,
  resumenDeFecha,
  fechaVencimientoResumen,
} from '@/lib/dates'
import { resumenCompra, mesInicioCompra, nroCuotaEnMes, importeCompraEnMes } from '@/lib/cuotas'
import { serviciosDeTarjetaEnMes } from '@/lib/servicios'
import { estaPagado, togglePagoMes } from '@/lib/pagos'
import { convertirUsdAArs } from '@/lib/cotizacion'
import { useCotizacionStore } from '@/store/cotizacionStore'
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
  const cotizacion = useCotizacionStore((s) => s.cotizacion)
  const promedioUsd = cotizacion?.promedio ?? null
  const mesRef = mesActual()

  const tarjetas = useLiveQuery(() => tarjetasRepo.todas(), [], [] as Tarjeta[])
  const compras = useLiveQuery(() => comprasRepo.todas(), [], [] as CompraTarjeta[])
  const servicios = useLiveQuery(() => serviciosRepo.todos(), [], [] as Servicio[])

  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [mesDetalle, setMesDetalle] = useState(mesActual())
  // Editor de fechas (cierre/vencimiento) puntual del resumen navegado.
  const [ajusteFechas, setAjusteFechas] = useState<{ cierre: string; vencimiento: string } | null>(null)

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
      .filter((c) => c.tarjetaId === tarjetaId && !c.servicioRecurrente)
      .reduce((acc, c) => acc + resumenCompra(c, mesRef).totalPendiente, 0)

  // Compras que se facturan en el resumen de un mes (cuota o servicio recurrente).
  const comprasDelMes = (tarjetaId: number, mes: string) =>
    compras.filter((c) => c.tarjetaId === tarjetaId && importeCompraEnMes(c, mes) > 0)

  // Total que se debita a la tarjeta en un mes (cuotas + servicios adheridos).
  const totalTarjetaMes = (tarjetaId: number, mes: string) =>
    comprasDelMes(tarjetaId, mes).reduce((acc, c) => acc + importeCompraEnMes(c, mes), 0) +
    serviciosDeTarjetaEnMes(servicios, tarjetaId, mes)

  // Total ya pagado del resumen de un mes (compras tildadas).
  const pagadoTarjetaMes = (tarjetaId: number, mes: string) =>
    comprasDelMes(tarjetaId, mes)
      .filter((c) => estaPagado(c.mesesPagados, mes))
      .reduce((acc, c) => acc + importeCompraEnMes(c, mes), 0)

  // ¿Todas las compras del resumen de ese mes están pagadas?
  const resumenPagado = (tarjetaId: number, mes: string) => {
    const b = comprasDelMes(tarjetaId, mes)
    return b.length > 0 && b.every((c) => estaPagado(c.mesesPagados, mes))
  }

  // Tilda/destilda una compra puntual en un mes de resumen.
  const toggleCompraPagada = (c: CompraTarjeta, mes: string) =>
    comprasRepo.actualizar(c.id!, { mesesPagados: togglePagoMes(c.mesesPagados, mes) })

  // Marca (o desmarca) todo el resumen del mes de una tarjeta de una vez.
  const toggleTarjetaPagada = async (tarjetaId: number, mes: string) => {
    const b = comprasDelMes(tarjetaId, mes)
    const marcar = !(b.length > 0 && b.every((c) => estaPagado(c.mesesPagados, mes)))
    for (const c of b) {
      if (estaPagado(c.mesesPagados, mes) !== marcar) await toggleCompraPagada(c, mes)
    }
  }

  const tarjetaSel = tarjetas.find((t) => t.id === seleccionada) ?? null
  const comprasSel = compras.filter((c) => c.tarjetaId === seleccionada)

  // --- acciones tarjeta ---
  const nuevaTarjeta = () => {
    setEditTarjetaId(null)
    setFormTarjeta({ ...TARJETA_VACIA })
  }
  const editarTarjeta = (t: Tarjeta) => {
    setEditTarjetaId(t.id!)
    setFormTarjeta({
      nombre: t.nombre,
      banco: t.banco,
      color: t.color,
      diaCierre: t.diaCierre,
      diaVencimiento: t.diaVencimiento,
      cierres: t.cierres,
      vencimientos: t.vencimientos,
    })
  }
  // Reubica las compras de una tarjeta en el resumen correcto según su cierre.
  const recomputarResumenes = async (
    tarjetaId: number,
    diaCierre?: number,
    cierres?: Record<string, string>,
  ) => {
    for (const c of compras.filter((c) => c.tarjetaId === tarjetaId)) {
      await comprasRepo.actualizar(c.id!, {
        mesPrimerResumen: resumenDeFecha(c.fechaCompra, diaCierre, cierres),
      })
    }
  }

  // Abre el editor de fechas del resumen navegado (prefill con las vigentes).
  const abrirAjusteFechas = () => {
    setAjusteFechas({
      cierre: periodoDetalle?.cierre ?? '',
      vencimiento: vencDetalle ?? '',
    })
  }

  // Guarda las fechas puntuales de ESTE resumen (override) y reubica compras.
  const guardarAjusteFechas = async () => {
    if (!tarjetaSel || !ajusteFechas) return
    const cierres = { ...(tarjetaSel.cierres ?? {}) }
    const vencimientos = { ...(tarjetaSel.vencimientos ?? {}) }
    if (ajusteFechas.cierre) cierres[mesDetalle] = ajusteFechas.cierre
    else delete cierres[mesDetalle]
    if (ajusteFechas.vencimiento) vencimientos[mesDetalle] = ajusteFechas.vencimiento
    else delete vencimientos[mesDetalle]
    await tarjetasRepo.actualizar(tarjetaSel.id!, { cierres, vencimientos })
    await recomputarResumenes(tarjetaSel.id!, tarjetaSel.diaCierre, cierres)
    setAjusteFechas(null)
  }

  // Quita el override de este resumen y vuelve al día habitual.
  const restablecerFechas = async () => {
    if (!tarjetaSel) return
    const cierres = { ...(tarjetaSel.cierres ?? {}) }
    const vencimientos = { ...(tarjetaSel.vencimientos ?? {}) }
    delete cierres[mesDetalle]
    delete vencimientos[mesDetalle]
    await tarjetasRepo.actualizar(tarjetaSel.id!, { cierres, vencimientos })
    await recomputarResumenes(tarjetaSel.id!, tarjetaSel.diaCierre, cierres)
    setAjusteFechas(null)
  }

  const guardarTarjeta = async () => {
    if (!formTarjeta || !formTarjeta.nombre.trim()) return
    if (editTarjetaId != null) {
      const antes = tarjetas.find((t) => t.id === editTarjetaId)
      await tarjetasRepo.actualizar(editTarjetaId, formTarjeta)
      const suyas = compras.filter((c) => c.tarjetaId === editTarjetaId)
      // Reubicar sus compras si cambió el cierre, o completar las que aún no
      // tienen resumen asignado (backfill de compras viejas).
      const cambioCierre =
        antes &&
        (antes.diaCierre !== formTarjeta.diaCierre ||
          JSON.stringify(antes.cierres ?? {}) !== JSON.stringify(formTarjeta.cierres ?? {}))
      const faltanResumen = suyas.some((c) => c.mesPrimerResumen == null)
      if (cambioCierre || faltanResumen) {
        await recomputarResumenes(editTarjetaId, formTarjeta.diaCierre, formTarjeta.cierres)
      }
    } else {
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
    // Si es en dólares, editamos el importe en USD (el original), no el convertido.
    if (resto.moneda === 'USD' && resto.importeOriginalUSD != null) {
      setFormCompra({ ...resto, importePorCuota: resto.importeOriginalUSD })
    } else {
      setFormCompra(resto)
    }
  }
  const guardarCompra = async () => {
    if (!formCompra || seleccionada == null) return
    if (!formCompra.descripcion.trim() || formCompra.importePorCuota <= 0 || formCompra.cantidadCuotas < 1)
      return
    // En dólares necesitamos la cotización para convertir a pesos.
    const esUSD = formCompra.moneda === 'USD'
    if (esUSD && !promedioUsd) return
    // Resumen donde cae la 1ª cuota, según el cierre de la tarjeta.
    const mesPrimerResumen = resumenDeFecha(
      formCompra.fechaCompra,
      tarjetaSel?.diaCierre,
      tarjetaSel?.cierres,
    )
    // cuotaActual como snapshot informativo respecto del mes actual
    const cuotaActual = nroCuotaEnMes(mesPrimerResumen, formCompra.cantidadCuotas, mesRef)
    // Si es USD, el importe cargado es en dólares: se guarda el original y el
    // convertido a pesos (a la cotización del día) que usan todos los cálculos.
    const camposMoneda = esUSD
      ? {
          moneda: 'USD' as const,
          importeOriginalUSD: formCompra.importePorCuota,
          cotizacion: promedioUsd!,
          importePorCuota: convertirUsdAArs(formCompra.importePorCuota, promedioUsd!),
        }
      : { moneda: 'ARS' as const, importeOriginalUSD: undefined, cotizacion: undefined }
    const datos = {
      ...formCompra,
      ...camposMoneda,
      mesPrimerResumen,
      cuotaActual,
      tarjetaId: seleccionada,
    }
    if (editCompraId != null) await comprasRepo.actualizar(editCompraId, datos)
    else await comprasRepo.agregar(datos)
    setFormCompra(null)
  }

  // --- finalizar / adelantar cuotas ---
  const [finalizando, setFinalizando] = useState<CompraTarjeta | null>(null)
  const [adelantar, setAdelantar] = useState(1)
  const restantesDe = (c: CompraTarjeta) => resumenCompra(c, mesRef).cuotasRestantes

  const confirmarFinalizar = async () => {
    if (!finalizando) return
    const n = Math.min(Math.max(1, adelantar), restantesDe(finalizando))
    const ya = finalizando.cuotasAdelantadas ?? 0
    // Lo adelantado se paga ahora: se suma como un pago en el mes actual y se
    // acortan las cuotas del final (el total se conserva).
    const adelantos = [
      ...(finalizando.adelantos ?? []),
      { mes: mesRef, importe: n * finalizando.importePorCuota },
    ]
    await comprasRepo.actualizar(finalizando.id!, { cuotasAdelantadas: ya + n, adelantos })
    setFinalizando(null)
  }

  // --- marcar como servicio ---
  const toggleServicioCompra = (c: CompraTarjeta) =>
    comprasRepo.actualizar(c.id!, { esServicio: !c.esServicio })

  // --- filas de plan expandibles (desglose de lo unificado) ---
  const [comprasAbiertas, setComprasAbiertas] = useState<Set<number>>(new Set())
  const toggleAbierta = (id: number) =>
    setComprasAbiertas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // --- unificar en un plan ---
  const [selUnif, setSelUnif] = useState<Set<number>>(new Set())
  const [unifOpen, setUnifOpen] = useState(false)
  const [unifForm, setUnifForm] = useState({ nombre: 'Plan Z', cuotas: 12, interes: 0 })
  const toggleSel = (id: number) =>
    setSelUnif((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const confirmarUnificar = async () => {
    if (seleccionada == null || selUnif.size < 2 || unifForm.cuotas < 1) return
    const elegidas = compras.filter((c) => c.id != null && selUnif.has(c.id))
    const detalle = elegidas.map((c) => ({
      descripcion: c.descripcion,
      importe: resumenCompra(c, mesRef).totalPendiente,
    }))
    const saldo = detalle.reduce((a, x) => a + x.importe, 0)
    const conInteres = Math.round(saldo * (1 + unifForm.interes / 100))
    const importePorCuota = Math.round(conInteres / unifForm.cuotas)
    await comprasRepo.agregar({
      tarjetaId: seleccionada,
      descripcion: unifForm.nombre.trim() || 'Plan de pago',
      comercio: '',
      fechaCompra: hoyISO(),
      // La 1ª cuota del plan arranca en el período actual, no en el siguiente.
      mesPrimerResumen: mesRef,
      cantidadCuotas: unifForm.cuotas,
      cuotaActual: 1,
      importePorCuota,
      observaciones: `Unificación de ${elegidas.length} compras${unifForm.interes ? ` (interés ${unifForm.interes}%)` : ''}`,
      unificaDe: detalle,
    })
    // Finalizar las originales (sin cuotas futuras).
    for (const c of elegidas) {
      const restan = resumenCompra(c, mesRef).cuotasRestantes
      await comprasRepo.actualizar(c.id!, { cuotasAdelantadas: (c.cuotasAdelantadas ?? 0) + restan })
    }
    setSelUnif(new Set())
    setUnifOpen(false)
  }

  const activas = comprasSel.filter((c) => c.servicioRecurrente || resumenCompra(c, mesRef).pendiente)
  const finalizadas = comprasSel.filter((c) => !c.servicioRecurrente && !resumenCompra(c, mesRef).pendiente)

  const periodoDetalle = tarjetaSel ? periodoResumen(mesDetalle, tarjetaSel.diaCierre, tarjetaSel.cierres) : null
  const vencDetalle = tarjetaSel
    ? fechaVencimientoResumen(mesDetalle, tarjetaSel.diaVencimiento, tarjetaSel.vencimientos)
    : null
  const cierreEsOverride = !!(tarjetaSel?.cierres && tarjetaSel.cierres[mesDetalle])
  const comprasPeriodo = tarjetaSel ? comprasDelMes(tarjetaSel.id!, mesDetalle) : []
  const totalPeriodo = tarjetaSel ? totalTarjetaMes(tarjetaSel.id!, mesDetalle) : 0
  const pagadoPeriodo = tarjetaSel ? pagadoTarjetaMes(tarjetaSel.id!, mesDetalle) : 0
  const faltaPeriodo = totalPeriodo - pagadoPeriodo
  const periodoTotalmentePagado = tarjetaSel ? resumenPagado(tarjetaSel.id!, mesDetalle) : false

  const tablaCompras = (lista: CompraTarjeta[], titulo: string, seleccionable: boolean) => (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-500">
        {titulo} ({lista.length})
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {seleccionable && <th className="w-8 px-3 py-3"></th>}
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
            {lista.map((c) => {
              const r = resumenCompra(c, mesRef)
              const unificado = c.unificaDe && c.unificaDe.length > 0
              const abierta = c.id != null && comprasAbiertas.has(c.id)
              return (
                <Fragment key={c.id}>
                <tr className={`border-b border-slate-100 hover:bg-slate-50 ${!c.servicioRecurrente && !r.pendiente ? 'opacity-60' : ''}`}>
                  {seleccionable && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selUnif.has(c.id!)}
                        onChange={() => toggleSel(c.id!)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        title="Seleccionar para unificar"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      {unificado && (
                        <button
                          onClick={() => toggleAbierta(c.id!)}
                          className="text-slate-400 hover:text-slate-700"
                          aria-label="Ver compras unificadas"
                        >
                          {abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                      {c.descripcion}
                      {unificado && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                          plan de {c.unificaDe!.length}
                        </span>
                      )}
                      {c.esServicio && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-700">
                          <Repeat size={10} /> servicio
                        </span>
                      )}
                      {c.moneda === 'USD' && c.importeOriginalUSD != null && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          US$ {(c.importeOriginalUSD / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {[c.comercio, fechaLegible(c.fechaCompra)].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {c.servicioRecurrente
                        ? 'Recurrente'
                        : r.estado === 'encurso'
                          ? `${r.cuotaActual} de ${r.cantidadCuotas}`
                          : r.estado === 'proxima'
                            ? `Empieza ${etiquetaMes(r.mesInicio)}`
                            : 'Finalizada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular text-slate-700">{money(c.importePorCuota)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular text-slate-900">
                    {c.servicioRecurrente ? `${money(c.importePorCuota)}/mes` : money(r.totalPendiente)}
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
                  <td className="px-4 py-3 text-slate-600">{r.mesFin ? etiquetaMes(r.mesFin) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <BotonAdjuntos entidadTipo="compra" entidadId={c.id!} titulo={`Comprobantes · ${c.descripcion}`} />
                      <button
                        onClick={() => toggleServicioCompra(c)}
                        className={`rounded-lg p-1.5 hover:bg-cyan-50 hover:text-cyan-600 ${c.esServicio ? 'text-cyan-600' : 'text-slate-400'}`}
                        aria-label="Marcar como servicio"
                        title={c.esServicio ? 'Quitar de Servicios' : 'Mostrar en Servicios'}
                      >
                        <Repeat size={16} />
                      </button>
                      {!c.servicioRecurrente && r.pendiente && (
                        <button
                          onClick={() => {
                            setFinalizando(c)
                            setAdelantar(r.cuotasRestantes)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          aria-label="Finalizar o adelantar cuotas"
                          title="Finalizar / adelantar cuotas"
                        >
                          <Ban size={16} />
                        </button>
                      )}
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
                {abierta &&
                  c.unificaDe!.map((u, k) => (
                    <tr key={k} className="border-b border-slate-50 bg-slate-50/40 text-xs">
                      {seleccionable && <td></td>}
                      <td className="px-4 py-1.5 pl-9 text-slate-500" colSpan={3}>
                        {u.descripcion}
                      </td>
                      <td className="px-4 py-1.5 text-right tabular text-slate-500">{money(u.importe)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

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
              (c) => c.tarjetaId === t.id && (c.servicioRecurrente || resumenCompra(c, mesRef).pendiente),
            ).length
            const totalMes = totalTarjetaMes(t.id!, mesRef)
            const pagadoMes = resumenPagado(t.id!, mesRef)
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
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-xs opacity-80">Este mes ({etiquetaMes(mesRef)})</div>
                      <div className="text-2xl font-bold tabular">{money(totalMes)}</div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTarjetaPagada(t.id!, mesRef)
                      }}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        pagadoMes ? 'bg-white/90 text-emerald-700' : 'bg-white/25 hover:bg-white/40'
                      }`}
                      title={pagadoMes ? 'Resumen pagado (tocá para desmarcar)' : 'Marcar todo el resumen como pagado'}
                    >
                      {pagadoMes ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {pagadoMes ? 'Pagado' : 'Pagar'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs opacity-80">
                    Pendiente {money(pendiente)} · {activas}{' '}
                    {activas === 1 ? 'compra activa' : 'compras activas'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {tarjetaSel && (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: tarjetaSel.color }} />
              Compras de {tarjetaSel.nombre}
            </h2>
            <div className="flex gap-2">
              {selUnif.size >= 2 && (
                <Button variante="secondary" onClick={() => setUnifOpen(true)}>
                  <Layers size={16} /> Unificar {selUnif.size} en un plan
                </Button>
              )}
              <Button onClick={nuevaCompra}>
                <Plus size={18} /> Nueva compra
              </Button>
            </div>
          </div>

          {/* Resumen del período (mes) */}
          {periodoDetalle && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    Resumen de {etiquetaMes(mesDetalle, true)} <span className="text-slate-400 normal-case">(se paga este mes)</span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    Compras del {fechaLegible(periodoDetalle.desde)} al {fechaLegible(periodoDetalle.hasta)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {(tarjetaSel.diaCierre || cierreEsOverride) && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={13} className="text-amber-500" />
                        Cierra {fechaLegible(periodoDetalle.cierre)}
                        {cierreEsOverride && (
                          <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-700">ajustado</span>
                        )}
                      </span>
                    )}
                    {vencDetalle && <span>Vence {fechaLegible(vencDetalle)}</span>}
                    <button
                      onClick={abrirAjusteFechas}
                      className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                    >
                      <Pencil size={12} /> Ajustar fechas de este resumen
                    </button>
                  </div>
                </div>
                <MonthNav mes={mesDetalle} onCambiar={setMesDetalle} />
              </div>
              {/* Total / Pagado / Falta del resumen */}
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <div className="text-xs text-slate-500">Total del resumen</div>
                  <div className="text-xl font-bold tabular text-slate-900">{money(totalPeriodo)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Pagado</div>
                  <div className="text-xl font-bold tabular text-emerald-600">{money(pagadoPeriodo)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Falta pagar</div>
                  <div className="text-xl font-bold tabular text-rose-600">{money(faltaPeriodo)}</div>
                </div>
              </div>

              {/* Movimientos del resumen, con tilde de pagado por compra */}
              {comprasPeriodo.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {comprasPeriodo.map((c) => {
                        const pagada = estaPagado(c.mesesPagados, mesDetalle)
                        const r = resumenCompra(c, mesDetalle)
                        return (
                          <tr key={c.id} className="border-b border-slate-100 last:border-0">
                            <td className="w-10 px-3 py-2.5">
                              <button
                                onClick={() => toggleCompraPagada(c, mesDetalle)}
                                className={pagada ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}
                                aria-label={pagada ? 'Marcar como no pagada' : 'Marcar como pagada'}
                                title={pagada ? 'Pagada (tocá para desmarcar)' : 'Marcar como pagada'}
                              >
                                {pagada ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                              </button>
                            </td>
                            <td className="px-2 py-2.5">
                              <div className={`font-medium ${pagada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {c.descripcion}
                              </div>
                              <div className="text-xs text-slate-400">
                                {c.servicioRecurrente
                                  ? 'Recurrente'
                                  : (c.adelantos ?? []).some((a) => a.mes === mesDetalle)
                                    ? 'Pago anticipado'
                                    : `Cuota ${r.cuotaActual} de ${r.cantidadCuotas}`}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium tabular text-slate-900">
                              {money(importeCompraEnMes(c, mesDetalle))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <Button
                  variante={periodoTotalmentePagado ? 'secondary' : 'primary'}
                  onClick={() => toggleTarjetaPagada(tarjetaSel.id!, mesDetalle)}
                  disabled={comprasPeriodo.length === 0}
                >
                  {periodoTotalmentePagado ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  {periodoTotalmentePagado ? 'Resumen pagado' : 'Marcar todo el resumen pagado'}
                </Button>
              </div>
            </div>
          )}

          {comprasSel.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              titulo="Sin compras cargadas"
              descripcion="Agregá una compra en cuotas y el sistema arma el cronograma."
            />
          ) : (
            <>
              {activas.length > 0 && tablaCompras(activas, 'Activas', true)}
              {finalizadas.length > 0 && tablaCompras(finalizadas, 'Finalizadas', false)}
              {selUnif.size > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  {selUnif.size} seleccionada(s). Marcá 2 o más para unificarlas en un plan de pago.
                </p>
              )}
            </>
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
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Día de cierre habitual" hint="El resumen cierra ese día del mes anterior.">
                <TextInput
                  type="number"
                  min={1}
                  max={31}
                  value={formTarjeta.diaCierre ?? ''}
                  onChange={(e) =>
                    setFormTarjeta({
                      ...formTarjeta,
                      diaCierre: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Ej: 27"
                />
              </Campo>
              <Campo label="Día de vencimiento" hint="Día de pago dentro del mes del resumen.">
                <TextInput
                  type="number"
                  min={1}
                  max={31}
                  value={formTarjeta.diaVencimiento ?? ''}
                  onChange={(e) =>
                    setFormTarjeta({
                      ...formTarjeta,
                      diaVencimiento: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Ej: 10"
                />
              </Campo>
            </div>
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
            <Campo label="Moneda">
              <div className="flex gap-2">
                {(['ARS', 'USD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormCompra({ ...formCompra, moneda: m })}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      (formCompra.moneda ?? 'ARS') === m
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'ARS' ? 'Pesos' : 'Dólares (US$)'}
                  </button>
                ))}
              </div>
              {formCompra.moneda === 'USD' && !promedioUsd && (
                <p className="mt-1 text-xs text-rose-600">
                  Necesito la cotización del dólar para convertir. Abrí el Dashboard para traerla.
                </p>
              )}
            </Campo>
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
              <Campo label={formCompra.moneda === 'USD' ? 'Importe por cuota (US$)' : 'Importe por cuota'} requerido>
                <MoneyInput
                  value={formCompra.importePorCuota}
                  onChange={(importePorCuota) => setFormCompra({ ...formCompra, importePorCuota })}
                />
              </Campo>
            </div>

            {formCompra.moneda === 'USD' ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Total en dólares:{' '}
                <strong>u$s {((formCompra.cantidadCuotas * formCompra.importePorCuota) / 100).toFixed(2)}</strong>
                {promedioUsd ? (
                  <span>
                    {' '}· ≈{' '}
                    <strong>
                      {money(convertirUsdAArs(formCompra.cantidadCuotas * formCompra.importePorCuota, promedioUsd))}
                    </strong>{' '}
                    a {money(promedioUsd)} (dólar oficial BNA)
                  </span>
                ) : (
                  <span className="text-rose-600"> · sin cotización disponible</span>
                )}
              </div>
            ) : (
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
            )}

            <Campo label="Observaciones">
              <TextInput
                value={formCompra.observaciones ?? ''}
                onChange={(e) => setFormCompra({ ...formCompra, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </Campo>

            <div className="rounded-lg border border-slate-200 p-3">
              <Checkbox
                label="Es un servicio (mostrarlo en la pestaña Servicios)"
                checked={formCompra.esServicio ?? false}
                onChange={(e) => setFormCompra({ ...formCompra, esServicio: e.target.checked })}
              />
              {formCompra.esServicio && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Campo label="Categoría">
                    <Select
                      value={formCompra.categoriaServicio ?? (config?.categorias?.[0] ?? 'Servicios')}
                      onChange={(e) => setFormCompra({ ...formCompra, categoriaServicio: e.target.value })}
                    >
                      {(config?.categorias ?? []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Campo>
                  <div className="flex items-end pb-2">
                    <Checkbox
                      label="Se repite todos los meses"
                      checked={formCompra.servicioRecurrente ?? false}
                      onChange={(e) => setFormCompra({ ...formCompra, servicioRecurrente: e.target.checked })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setFormCompra(null)}>
                Cancelar
              </Button>
              <Button
                onClick={guardarCompra}
                disabled={
                  !formCompra.descripcion.trim() ||
                  formCompra.importePorCuota <= 0 ||
                  formCompra.cantidadCuotas < 1 ||
                  (formCompra.moneda === 'USD' && !promedioUsd)
                }
              >
                {editCompraId != null ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal finalizar / adelantar cuotas */}
      <Modal
        abierto={finalizando != null}
        titulo={`Finalizar / adelantar · ${finalizando?.descripcion ?? ''}`}
        onCerrar={() => setFinalizando(null)}
        ancho="max-w-sm"
      >
        {finalizando && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Le quedan <strong className="text-slate-900">{restantesDe(finalizando)} cuotas</strong> de{' '}
              {money(finalizando.importePorCuota)}.
            </div>
            <Campo label="¿Cuántas cuotas adelantás?" hint="Adelantar todas = finalizar la compra.">
              <TextInput
                type="number"
                min={1}
                max={restantesDe(finalizando)}
                value={adelantar}
                onChange={(e) => setAdelantar(Number(e.target.value))}
              />
            </Campo>
            <button
              onClick={() => setAdelantar(restantesDe(finalizando))}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Finalizar (adelantar las {restantesDe(finalizando)})
            </button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variante="secondary" onClick={() => setFinalizando(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmarFinalizar}>
                {adelantar >= restantesDe(finalizando) ? 'Finalizar compra' : `Adelantar ${adelantar}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal unificar en un plan */}
      <Modal abierto={unifOpen} titulo="Unificar en un plan de pago" onCerrar={() => setUnifOpen(false)} ancho="max-w-md">
        {(() => {
          const elegidas = compras.filter((c) => c.id != null && selUnif.has(c.id))
          const saldo = elegidas.reduce((a, c) => a + resumenCompra(c, mesRef).totalPendiente, 0)
          const conInteres = Math.round(saldo * (1 + unifForm.interes / 100))
          const porCuota = unifForm.cuotas > 0 ? Math.round(conInteres / unifForm.cuotas) : 0
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Unificás <strong>{elegidas.length}</strong> compras. Saldo pendiente:{' '}
                <strong className="tabular text-slate-900">{money(saldo)}</strong>.
              </div>
              <Campo label="Nombre del plan">
                <TextInput value={unifForm.nombre} onChange={(e) => setUnifForm({ ...unifForm, nombre: e.target.value })} />
              </Campo>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Cantidad de cuotas" requerido>
                  <TextInput
                    type="number"
                    min={1}
                    value={unifForm.cuotas}
                    onChange={(e) => setUnifForm({ ...unifForm, cuotas: Number(e.target.value) })}
                  />
                </Campo>
                <Campo label="Interés total %">
                  <TextInput
                    type="number"
                    min={0}
                    value={unifForm.interes}
                    onChange={(e) => setUnifForm({ ...unifForm, interes: Number(e.target.value) })}
                  />
                </Campo>
              </div>
              <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
                Total con interés: <strong className="tabular">{money(conInteres)}</strong> →{' '}
                <strong className="tabular">{unifForm.cuotas} × {money(porCuota)}</strong>
              </div>
              <p className="text-xs text-slate-400">
                Las compras originales quedan finalizadas y se crea el plan nuevo (sin duplicar el saldo).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variante="secondary" onClick={() => setUnifOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmarUnificar} disabled={unifForm.cuotas < 1}>
                  Crear plan
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal ajustar fechas puntuales del resumen navegado */}
      <Modal
        abierto={ajusteFechas != null}
        titulo={`Fechas del resumen · ${etiquetaMes(mesDetalle, true)}`}
        onCerrar={() => setAjusteFechas(null)}
        ancho="max-w-sm"
      >
        {ajusteFechas && (
          <div className="space-y-4">
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Cambiá el cierre o el vencimiento solo para <strong>este</strong> resumen (por ejemplo si
              este mes se corrió). Los demás meses siguen con el día habitual.
            </p>
            <Campo label="Fecha de cierre" hint="Última compra que entra en este resumen.">
              <TextInput
                type="date"
                value={ajusteFechas.cierre}
                onChange={(e) => setAjusteFechas({ ...ajusteFechas, cierre: e.target.value })}
              />
            </Campo>
            <Campo label="Fecha de vencimiento" hint="Hasta cuándo pagarlo.">
              <TextInput
                type="date"
                value={ajusteFechas.vencimiento}
                onChange={(e) => setAjusteFechas({ ...ajusteFechas, vencimiento: e.target.value })}
              />
            </Campo>
            <div className="flex items-center justify-between pt-2">
              {cierreEsOverride || (tarjetaSel?.vencimientos && tarjetaSel.vencimientos[mesDetalle]) ? (
                <button onClick={restablecerFechas} className="text-xs font-medium text-slate-500 hover:underline">
                  Volver al día habitual
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variante="secondary" onClick={() => setAjusteFechas(null)}>
                  Cancelar
                </Button>
                <Button onClick={guardarAjusteFechas}>Guardar</Button>
              </div>
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
