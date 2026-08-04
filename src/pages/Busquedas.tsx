import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, TrendingUp, Receipt, CreditCard, Landmark, HandCoins, Repeat } from 'lucide-react'
import PageShell from '@/components/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import { TextInput, Select } from '@/components/ui/Form'
import { db } from '@/db/db'
import { useDatosFinancieros } from '@/store/useDatosFinancieros'
import { buscar, type TipoResultado } from '@/lib/busqueda'
import { fechaLegible } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Prestado, Tarjeta } from '@/models'
import type { LucideIcon } from 'lucide-react'

const META: Record<TipoResultado, { label: string; icon: LucideIcon; color: string }> = {
  ingreso: { label: 'Ingreso', icon: TrendingUp, color: 'text-emerald-600' },
  gasto: { label: 'Gasto', icon: Receipt, color: 'text-rose-600' },
  tarjeta: { label: 'Tarjeta', icon: CreditCard, color: 'text-amber-600' },
  prestamo: { label: 'Préstamo', icon: Landmark, color: 'text-indigo-600' },
  prestado: { label: 'Prestado', icon: HandCoins, color: 'text-cyan-600' },
  servicio: { label: 'Servicio', icon: Repeat, color: 'text-cyan-600' },
}

export default function Busquedas() {
  const datos = useDatosFinancieros()
  const prestados = useLiveQuery(() => db.prestados.toArray(), [], [] as Prestado[])
  const tarjetas = useLiveQuery(() => db.tarjetas.toArray(), [], [] as Tarjeta[])

  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoResultado | 'todos'>('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const fuentes = { ...datos, servicios: datos.servicios ?? [], prestados, tarjetas }
  const resultados = buscar(fuentes, {
    texto,
    tipo,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })

  const buscando = texto.trim() !== '' || tipo !== 'todos' || desde !== '' || hasta !== ''

  return (
    <PageShell titulo="Búsquedas" descripcion="Buscá en todos tus movimientos">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Descripción, comercio, persona, tarjeta, categoría…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Tipo</span>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoResultado | 'todos')}>
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
              <option value="tarjeta">Tarjetas</option>
              <option value="prestamo">Préstamos</option>
              <option value="prestado">Prestado</option>
              <option value="servicio">Servicios</option>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Desde</span>
            <TextInput type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Hasta</span>
            <TextInput type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      </div>

      {!buscando ? (
        <EmptyState
          icon={Search}
          titulo="Empezá a buscar"
          descripcion="Escribí un término o aplicá filtros para ver resultados."
        />
      ) : resultados.length === 0 ? (
        <EmptyState icon={Search} titulo="Sin resultados" descripcion="Probá con otros términos o filtros." />
      ) : (
        <>
          <div className="mb-2 text-sm text-slate-500">
            {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {resultados.map((r) => {
                const m = META[r.tipo]
                const Icon = m.icon
                return (
                  <li key={`${r.tipo}-${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                        <Icon size={18} className={m.color} />
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{r.titulo}</div>
                        <div className="text-xs text-slate-400">
                          {m.label}
                          {r.subtitulo ? ` · ${r.subtitulo}` : ''} · {fechaLegible(r.fecha)}
                        </div>
                      </div>
                    </div>
                    <span className={`font-medium tabular ${r.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatMoney(r.importe)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </PageShell>
  )
}
