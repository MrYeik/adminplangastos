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
  Lock,
} from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Form'
import { db } from '@/db/db'
import { comprasRepo } from '@/db/repos/tarjetas'
import { gastosRepo } from '@/db/repos/gastos'
import { extraerLineasPDF, PasswordRequeridaError } from '@/lib/pdfExtract'
import { detectarResumen, type Consumo } from '@/lib/resumenes'
import { fechaLegible } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Tarjeta } from '@/models'

function categoriaDe(detalle: string): string {
  const d = detalle.toLowerCase()
  if (/iva|percep|impuesto|sellos|arca|afip|db\.rg|rg \d/.test(d)) return 'Impuestos'
  if (/seguro/.test(d)) return 'Seguros'
  return 'Otros'
}

function esCompraEnCuotas(c: Consumo): boolean {
  return c.plan === 'cuotas' && (c.cuotaTotal ?? 0) > 1
}

export default function ImportarResumen() {
  const fileRef = useRef<HTMLInputElement>(null)
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), [], [] as Tarjeta[])

  const [tarjetaId, setTarjetaId] = useState<number | ''>('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [banco, setBanco] = useState('')
  const [consumos, setConsumos] = useState<Consumo[]>([])
  const [incluidos, setIncluidos] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [importados, setImportados] = useState<{ compras: number; gastos: number } | null>(null)

  // Contraseña del PDF
  const [passwordRequerida, setPasswordRequerida] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const reset = () => {
    setConsumos([])
    setIncluidos([])
    setBanco('')
    setError(null)
    setPasswordRequerida(false)
    setPassword('')
    setPasswordError(false)
  }

  const procesar = async (file: File, pwd?: string) => {
    setCargando(true)
    setError(null)
    setImportados(null)
    try {
      const lineas = await extraerLineasPDF(file, pwd)
      const detectado = detectarResumen(lineas)
      if (!detectado) {
        setError('No reconozco el formato de este resumen. Por ahora leo Tarjeta Naranja y Visa Nación.')
        setCargando(false)
        return
      }
      if (detectado.consumos.length === 0) {
        setError('Detecté el resumen pero no encontré consumos.')
        setCargando(false)
        return
      }
      setPasswordRequerida(false)
      setPassword('')
      setBanco(detectado.banco)
      setConsumos(detectado.consumos)
      setIncluidos(detectado.consumos.map((c) => c.moneda === 'ARS'))
    } catch (e) {
      if (e instanceof PasswordRequeridaError) {
        setPasswordRequerida(true)
        setPasswordError(e.incorrecta)
      } else {
        setError('No se pudo leer el PDF. ¿Es un archivo válido?')
      }
    }
    setCargando(false)
  }

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    setArchivo(file)
    await procesar(file)
  }

  const toggle = (i: number) => setIncluidos((prev) => prev.map((v, j) => (j === i ? !v : v)))

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
          observaciones: `Importado del resumen (${banco})`,
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
          observaciones: `Importado del resumen (${banco})`,
          repetitivoMensual: false,
          tipo: 'variable',
        })
        gastos++
      }
    }
    setImportados({ compras, gastos })
    reset()
    setArchivo(null)
  }

  const sinTarjetas = tarjetas.length === 0

  return (
    <PageShell
      titulo="Importar resumen de tarjeta"
      descripcion="Arrastrá el PDF del resumen (Tarjeta Naranja o Visa Nación) y cargá los consumos"
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
        {archivo && (
          <span className="ml-3 inline-flex items-center gap-1 text-sm text-slate-500">
            <FileText size={14} /> {archivo.name}
            {banco && ` · ${banco} · ${consumos.length} consumos`}
          </span>
        )}
        {error && (
          <p className="mt-2 flex items-center gap-1 text-sm text-rose-600">
            <AlertTriangle size={15} /> {error}
          </p>
        )}

        {/* Contraseña del PDF */}
        {passwordRequerida && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
              <Lock size={15} /> Este PDF está protegido con contraseña
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && archivo && password) procesar(archivo, password)
                }}
                placeholder="Contraseña del resumen"
                className="max-w-xs"
                autoFocus
              />
              <Button
                onClick={() => archivo && procesar(archivo, password)}
                disabled={!password || cargando}
              >
                Descifrar
              </Button>
            </div>
            {passwordError && (
              <p className="mt-2 text-xs text-rose-600">Contraseña incorrecta, probá de nuevo.</p>
            )}
            <p className="mt-2 text-xs text-amber-700">
              La contraseña se usa solo para abrir el PDF en tu navegador; no se guarda.
            </p>
          </div>
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
                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${esUSD ? 'opacity-50' : ''}`}>
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
                          {c.subtarjeta || banco}
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
