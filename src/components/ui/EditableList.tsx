import { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface Props {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

/** Lista de chips editable: agregar por texto, quitar con la X. */
export default function EditableList({ items, onChange, placeholder = 'Agregar…' }: Props) {
  const [nuevo, setNuevo] = useState('')

  const agregar = () => {
    const v = nuevo.trim()
    if (!v || items.includes(v)) {
      setNuevo('')
      return
    }
    onChange([...items, v])
    setNuevo('')
  }

  const quitar = (item: string) => onChange(items.filter((i) => i !== item))

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.length === 0 && <span className="text-xs text-slate-400">Sin elementos.</span>}
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm text-slate-700"
          >
            {item}
            <button
              onClick={() => quitar(item)}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
              aria-label={`Quitar ${item}`}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar()
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        <button
          onClick={agregar}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Plus size={15} /> Agregar
        </button>
      </div>
    </div>
  )
}
