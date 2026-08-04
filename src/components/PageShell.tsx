import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
  children: ReactNode
}

export default function PageShell({ titulo, descripcion, acciones, children }: Props) {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
          {descripcion && <p className="text-sm text-slate-500 mt-1">{descripcion}</p>}
        </div>
        {acciones && <div className="flex items-center gap-2">{acciones}</div>}
      </header>
      {children}
    </div>
  )
}
