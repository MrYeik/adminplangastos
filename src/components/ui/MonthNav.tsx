import { ChevronLeft, ChevronRight } from 'lucide-react'
import { sumarMeses, etiquetaMes } from '@/lib/dates'

interface Props {
  mes: string
  onCambiar: (mes: string) => void
}

/** Navegador de meses: ‹ Mes Año ›. */
export default function MonthNav({ mes, onCambiar }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button
        onClick={() => onCambiar(sumarMeses(mes, -1))}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[130px] text-center text-sm font-medium capitalize text-slate-800">
        {etiquetaMes(mes, true)}
      </span>
      <button
        onClick={() => onCambiar(sumarMeses(mes, 1))}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
