import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Link } from 'react-router-dom'
import { Upload, FileUp, CheckCircle2, AlertTriangle, ArrowLeft, Check } from 'lucide-react'
import PageShell from '@/components/PageShell'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { db } from '@/db/db'
import {
  autoMapear,
  procesarFilas,
  parseCSV,
  CAMPOS_POR_DESTINO,
  ETIQUETA_CAMPO,
  type Destino,
  type Mapeo,
  type CampoDestino,
} from '@/lib/importar'
import { formatMoney } from '@/lib/money'
import { fechaLegible } from '@/lib/dates'
import type { Ingreso, Gasto } from '@/models'

const CAMPOS_OBLIGATORIOS: CampoDestino[] = ['descripcion', 'importe']

export default function Importar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [destino, setDestino] = useState<Destino>('gastos')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [filas, setFilas] = useState<string[][]>([])
  const [mapeo, setMapeo] = useState<Mapeo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importados, setImportados] = useState<number | null>(null)

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setImportados(null)
    try {
      const esCSV = /\.csv$/i.test(file.name) || file.type === 'text/csv'
      let aoa: unknown[][]
      if (esCSV) {
        // CSV: parser propio (texto UTF-8, sin coerción de tipos ni locale).
        aoa = parseCSV(await file.text())
      } else {
        // Excel: SheetJS (fechas y números reales vienen bien tipados).
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
      }
      if (aoa.length < 2) {
        setError('El archivo no tiene datos (se necesita encabezado + al menos una fila).')
        return
      }
      const norm = (c: unknown) =>
        c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? '').trim()
      const hs = aoa[0].map(norm)
      const fs = aoa
        .slice(1)
        .map((r) => r.map(norm))
        .filter((r) => r.some((c) => c !== ''))
      setNombreArchivo(file.name)
      setHeaders(hs)
      setFilas(fs)
      setMapeo(autoMapear(hs, destino))
    } catch {
      setError('No se pudo leer el archivo. ¿Es un CSV o Excel válido?')
    }
  }

  const cambiarDestino = (d: Destino) => {
    setDestino(d)
    if (headers.length) setMapeo(autoMapear(headers, d))
    setImportados(null)
  }

  const procesadas = useMemo(
    () => (mapeo ? procesarFilas(filas, mapeo, destino) : []),
    [filas, mapeo, destino],
  )
  const validas = procesadas.filter((p) => p.ok)
  const invalidas = procesadas.filter((p) => !p.ok)

  const faltanObligatorios = mapeo
    ? CAMPOS_OBLIGATORIOS.filter((c) => mapeo[c] < 0)
    : CAMPOS_OBLIGATORIOS

  const importar = async () => {
    if (!mapeo || validas.length === 0) return
    const registros = validas.map((p) => p.registro!)
    if (destino === 'ingresos') await db.ingresos.bulkAdd(registros as Ingreso[])
    else await db.gastos.bulkAdd(registros as Gasto[])
    setImportados(registros.length)
    setHeaders([])
    setFilas([])
    setMapeo(null)
    setNombreArchivo('')
  }

  return (
    <PageShell
      titulo="Importar movimientos"
      descripcion="Cargá ingresos o gastos desde un archivo CSV o Excel"
      acciones={
        <Link to="/configuracion">
          <Button variante="ghost">
            <ArrowLeft size={16} /> Configuración
          </Button>
        </Link>
      }
    >
      {importados != null && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={22} />
          <span className="font-medium">
            Se importaron {importados} {destino === 'ingresos' ? 'ingresos' : 'gastos'} correctamente.
          </span>
        </div>
      )}

      {/* Paso 1: destino + archivo */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <span className="mb-2 block text-sm font-medium text-slate-700">1. ¿Qué querés importar?</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-1">
            {(['gastos', 'ingresos'] as Destino[]).map((d) => (
              <button
                key={d}
                onClick={() => cambiarDestino(d)}
                className={`rounded-md px-4 py-1.5 text-sm capitalize transition-colors ${
                  destino === d ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">2. Elegí el archivo</span>
          <Button variante="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Seleccionar CSV o Excel
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={onArchivo}
          />
          {nombreArchivo && (
            <span className="ml-3 inline-flex items-center gap-1 text-sm text-slate-500">
              <FileUp size={14} /> {nombreArchivo} · {filas.length} filas
            </span>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>
      </div>

      {/* Paso 3: mapeo + preview */}
      {mapeo && headers.length > 0 && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <span className="mb-3 block text-sm font-medium text-slate-700">
              3. Verificá el mapeo de columnas
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_POR_DESTINO[destino].map((campo) => (
                <label key={campo} className="block">
                  <span className="mb-1 block text-xs text-slate-500">
                    {ETIQUETA_CAMPO[campo]}
                    {CAMPOS_OBLIGATORIOS.includes(campo) && <span className="text-rose-500"> *</span>}
                  </span>
                  <Select
                    value={mapeo[campo]}
                    onChange={(e) => setMapeo({ ...mapeo, [campo]: Number(e.target.value) })}
                  >
                    <option value={-1}>— sin asignar —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Columna ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
            {faltanObligatorios.length > 0 && (
              <p className="mt-3 flex items-center gap-1 text-sm text-amber-600">
                <AlertTriangle size={15} /> Asigná las columnas obligatorias:{' '}
                {faltanObligatorios.map((c) => ETIQUETA_CAMPO[c]).join(', ')}.
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">Vista previa</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check size={15} /> {validas.length} válidas
                </span>
                {invalidas.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <AlertTriangle size={15} /> {invalidas.length} con problemas
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 font-medium">Categoría</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 text-right font-medium">Importe</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {procesadas.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      {p.ok ? (
                        <>
                          <td className="px-4 py-2 text-slate-800">{p.registro!.descripcion}</td>
                          <td className="px-4 py-2 text-slate-600">{p.registro!.categoria}</td>
                          <td className="px-4 py-2 text-slate-600">{fechaLegible(p.registro!.fecha)}</td>
                          <td className="px-4 py-2 text-right tabular text-slate-800">
                            {formatMoney(p.registro!.importe)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <Check size={13} /> OK
                            </span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={5} className="px-4 py-2 text-xs text-rose-600">
                          Fila {p.fila}: {p.error}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {procesadas.length > 10 && (
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                y {procesadas.length - 10} filas más…
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={importar} disabled={validas.length === 0 || faltanObligatorios.length > 0}>
              <Check size={16} /> Importar {validas.length}{' '}
              {destino === 'ingresos' ? 'ingresos' : 'gastos'}
            </Button>
          </div>
        </>
      )}
    </PageShell>
  )
}
