import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  accion,
}: {
  icon: LucideIcon
  titulo: string
  descripcion?: string
  accion?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <Icon className="mx-auto mb-3 text-slate-300" size={40} />
      <p className="font-medium text-slate-600">{titulo}</p>
      {descripcion && <p className="mt-1 text-sm text-slate-400">{descripcion}</p>}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  )
}
