import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/** Sección con encabezado clickeable que muestra/oculta su contenido. */
export default function SeccionColapsable({
  titulo,
  subtitulo,
  defaultAbierto = true,
  children,
}: {
  titulo: string
  subtitulo?: ReactNode
  defaultAbierto?: boolean
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(defaultAbierto)
  return (
    <section className="mb-6">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
        aria-expanded={abierto}
      >
        {abierto ? (
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        )}
        <span className="text-sm font-semibold text-slate-600">{titulo}</span>
        {subtitulo != null && <span className="text-xs text-slate-400">· {subtitulo}</span>}
      </button>
      {abierto && children}
    </section>
  )
}
