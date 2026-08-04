import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}

export default function Modal({ abierto, titulo, onCerrar, children, ancho = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 overflow-y-auto"
      onMouseDown={onCerrar}
    >
      <div
        className={`mt-16 w-full ${ancho} rounded-xl bg-white shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
