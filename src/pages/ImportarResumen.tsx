import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Receipt,
  Check,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { db } from '@/db/db'
import { comprasRepo } from '@/db/repos/tarjetas'
import { gastosRepo } from '@/db/repos/gastos'
import { extraerLineasPDF } from '@/lib/pdfExtract'
import {
  parseResumenNaranja,
  esResumenNaranja,
  type ConsumoNaranja,
} from '@/lib/parseResumenNaranja'
import { fechaLegible } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Tarjeta } from '@/models'

function categoriaDe(detalle: string): string {
  const d = detalle.toLowerCase()
  if (/iva|percep|impuesto|sellos|arca|afip/.test(d)) return 'Impuestos'
  if (/seguro/.test(d)) return 'Seguros'
  return 'Otros'
}

/** ¿El consumo se carga como compra en cuotas? (si no, como gasto) */
function esCompraEnCuotas(c: ConsumoNaranja): boolean {
  return c.plan === 'cuotas' && (c.cuotaTotal ?? 0) > 1
}

export default function ImportarResumen() {
  const fileRef = useRef<HTMLInputElement>(null)
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), [], [] as Tarjeta[])

  const [tarjetaId, setTarjetaId] = useState<number | ''>('')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [consumos, setConsumos] = useState<ConsumoNaranja[]>([])
  const [incluidos, setIncluidos] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [importados, setImportados] = useState<{ compras: number; gastos: number } | null>(null)

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setImportados(null)
    setConsumos([])
    setCargando(true)
    try {
      const lineas = await extraerLineasPDF(file)
      if (!esResumenNaranja(lineas)) {
        setError('No parece un resumen de Tarjeta Naranja. Por ahora solo reconozco ese formato.')
        setCargando(false)
        return
      }
      const parsed = parseResumenNaranja(lineas)
      if (parsed.length === 0) {
        setError('No se encontraron consumos en el resumen.')
        setCargando(false)
        return
      }
      setNombreArchivo(file.name)
      setConsumos(parsed)
      // Por defecto se incluyen los consumos en pesos; los de dólares no.
      setIncluidos(parsed.map((c) => c.moneda === 'ARS'))
    } catch {
      setError('No se pudo leer el PDF. ¿Es un archivo válido?')
    }
    setCargando(false)
  }

  const toggle = (i: number) =>
    setIncluidos((prev) => prev.map((v, j) => (j === i ? !v : v)))

  const resumen = useMemo(() => {
    let compras = 0
    let gastos = 0
    let total = 0
    consumos.forEach((c, i) => {
      if (!incluidos[i] || c.moneda !== 'ARS') return
      total += c.importe
      if (esCompraEnCuotas(c)) compras++
      else gastos++
    })
    return { compras, gastos, total }
  }, [consumos, incluidos])

  const importar = async () => {
    if (tarjetaId === '') return
    let compras = 0
    let gastos = 0
    for (let i = 0; i < consumos.length; i++) {
      const c = consumos[i]
      if (!incluidos[i] || c.moneda !== 'ARS') continue
      if (esCompraEnCuotas(c)) {
        await comprasRepo.agregar({
          tarjetaId: Number(tarjetaId),
          descripcion: c.detalle,
          comercio: c.detalle,
          fechaCompra: c.fecha,
          cantidadCuotas: c.cuotaTotal!,
          cuotaActual: c.cuotaActual ?? 1,
          importePorCuota: c.importe,
          observaciones: 'Importado del resumen',
        })
        compras++
      } else {
        await gastosRepo.agregar({
          descripcion: c.detalle,
          categoria: categoriaDe(c.detalle),
          fecha: c.fecha,
          importe: c.importe,
          medioPago: 'Tarjeta de crédito',
          responsable: '',
          observaciones: 'Importado del resumen',
          repetitivoMensual: false,
          tipo: 'variable',
        })
        gastos++
      }
    }
    setImportados({ compras, gastos })
    setConsumos([])
    setIncluidos([])
    setNombreArchivo('')
  }

  const sinTarjetas = tarjetas.length === 0

  return (
    <PageShell
      titulo="Importar resumen de tarjeta"
      descripcion="Arrastrá el PDF del resumen de Tarjeta Naranja y cargá los consumos"
      acciones={
        <Link to="/importar">
          <Button variante="ghost">CSV / Excel</Button>
        </Link>
      }
    >
      {importados != null && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={22} />
          <span className="font-medium">
            Listo: {importados.compras} compras en cuotas y {importados.gastos} gastos importados.
          </span>
        </div>
      )}

      {/* Paso 1: tarjeta destino */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          1. ¿A qué tarjeta de la app corresponde este resumen?
        </span>
        {sinTarjetas ? (
          <p className="text-sm text-amber-600">
            Todavía no tenés tarjetas.{' '}
            <Link to="/tarjetas" className="font-medium text-brand-600 underline">
              Creá una primero
            </Link>
            .
          </p>
        ) : (
          <Select
            value={tarjetaId}
            onChange={(e) => setTarjetaId(e.target.value === '' ? '' : Number(e.target.value))}
            className="sm:max-w-xs"
          >
            <option value="">— elegí la tarjeta —</option>
            {tarjetas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
                {t.banco ? ` (${t.banco})` : ''}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Paso 2: archivo */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <span className="mb-2 block text-sm font-medium text-slate-700">2. Elegí el PDF del resumen</span>
        <Button variante="secondary" onClick={() => fileRef.current?.click()} disabled={cargando || sinTarjetas}>
          <Upload size={16} /> {cargando ? 'Leyendo…' : 'Seleccionar PDF'}
        </Button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onArchivo} />
        {nombreArchivo && (
          <span className="ml-3 inline-flex items-center gap-1 text-sm text-slate-500">
            <FileText size={14} /> {nombreArchivo} · {consumos.length} consumos
          </span>
        )}
        {error && (
          <p className="mt-2 flex items-center gap-1 text-sm text-rose-600">
            <AlertTriangle size={15} /> {error}
          </p>
        )}
      </div>

      {/* Vista previa */}
      {consumos.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <CreditCard size={15} className="text-amber-600" /> {resumen.compras} compras en cuotas
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Receipt size={15} className="text-rose-600" /> {resumen.gastos} gastos
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-medium text-slate-800">Total a importar: {formatMoney(resumen.total)}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3"></th>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Detalle</th>
                  <th className="px-3 py-3 font-medium">Se carga como</th>
                  <th className="px-3 py-3 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {consumos.map((c, i) => {
                  const esUSD = c.moneda === 'USD'
                  const compra = esCompraEnCuotas(c)
                  return (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 last:border-0 ${
                        esUSD ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={incluidos[i] ?? false}
                          disabled={esUSD}
                          onChange={() => toggle(i)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{fechaLegible(c.fecha)}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-800">{c.detalle}</div>
                        <div className="text-xs text-slate-400">
                          {c.subtarjeta || '—'}
                          {c.plan === 'zeta' && ' · Plan Zeta'}
                          {c.plan === 'debito' && ' · Débito automático'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {esUSD ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            En dólares (no se importa)
                          </span>
                        ) : compra ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            <CreditCard size={12} /> Compra {c.cuotaActual}/{c.cuotaTotal}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            <Receipt size={12} /> Gasto
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-900">
                        {esUSD ? `u$s ${(c.importe / 100).toFixed(2)}` : formatMoney(c.importe)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={importar} disabled={tarjetaId === '' || resumen.compras + resumen.gastos === 0}>
              <Check size={16} /> Importar {resumen.compras + resumen.gastos} movimientos
            </Button>
          </div>
          {tarjetaId === '' && (
            <p className="mt-2 text-right text-xs text-amber-600">Elegí primero la tarjeta destino (paso 1).</p>
          )}
        </>
      )}
    </PageShell>
  )
}
