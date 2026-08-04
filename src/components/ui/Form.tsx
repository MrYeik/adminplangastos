import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const baseInput =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50'

export function Campo({
  label,
  children,
  requerido,
  hint,
}: {
  label: string
  children: ReactNode
  requerido?: boolean
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {requerido && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={`${baseInput} bg-white ${props.className ?? ''}`}>
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      {label}
    </label>
  )
}
