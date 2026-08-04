import { useState, useEffect } from 'react'
import { aPesos, parseMoney } from '@/lib/money'

interface Props {
  /** Valor en centavos. */
  value: number
  /** Devuelve el nuevo valor en centavos. */
  onChange: (centavos: number) => void
  simbolo?: string
  placeholder?: string
  autoFocus?: boolean
}

const baseInput =
  'w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 tabular'

/** Input de dinero: el usuario escribe libre (1.234,56) y se guarda en centavos. */
export default function MoneyInput({
  value,
  onChange,
  simbolo = '$',
  placeholder = '0',
  autoFocus,
}: Props) {
  const [texto, setTexto] = useState('')

  // Sincroniza cuando el valor externo cambia (ej. al abrir el form para editar).
  useEffect(() => {
    setTexto(value ? String(aPesos(value)).replace('.', ',') : '')
  }, [value])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        {simbolo}
      </span>
      <input
        type="text"
        inputMode="decimal"
        className={baseInput}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          onChange(parseMoney(e.target.value))
        }}
      />
    </div>
  )
}
