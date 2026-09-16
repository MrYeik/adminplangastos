import { Sun, Moon, Laptop } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTemaStore, type Tema } from '@/store/temaStore'

const ORDEN: Tema[] = ['claro', 'oscuro', 'auto']
const INFO: Record<Tema, { icon: LucideIcon; label: string }> = {
  claro: { icon: Sun, label: 'Claro' },
  oscuro: { icon: Moon, label: 'Oscuro' },
  auto: { icon: Laptop, label: 'Auto' },
}

/** Botón que cicla el tema: Claro → Oscuro → Auto (sigue al sistema). */
export default function ToggleTema({ variante = 'sidebar' }: { variante?: 'sidebar' | 'topbar' }) {
  const tema = useTemaStore((s) => s.tema)
  const setTema = useTemaStore((s) => s.setTema)
  const { icon: Icon, label } = INFO[tema]
  const siguiente = ORDEN[(ORDEN.indexOf(tema) + 1) % ORDEN.length]
  const cambiar = () => setTema(siguiente)

  if (variante === 'topbar') {
    return (
      <button
        onClick={cambiar}
        title={`Tema: ${label}. Tocá para cambiar.`}
        aria-label={`Tema: ${label}. Tocá para cambiar.`}
        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
      >
        <Icon size={20} />
      </button>
    )
  }

  return (
    <button
      onClick={cambiar}
      title={`Tema: ${label}. Tocá para cambiar.`}
      aria-label={`Tema: ${label}. Tocá para cambiar.`}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
    >
      <Icon size={15} />
      <span>Tema: {label}</span>
    </button>
  )
}
