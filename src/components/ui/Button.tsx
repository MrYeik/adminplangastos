import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost'

const ESTILOS: Record<Variante, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  children: ReactNode
}

export default function Button({ variante = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ESTILOS[variante]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
