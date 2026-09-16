import { create } from 'zustand'

export type Tema = 'claro' | 'oscuro' | 'auto'

const KEY = 'aura-tema'
const mq = () => window.matchMedia('(prefers-color-scheme: dark)')

function esOscuro(t: Tema): boolean {
  return t === 'oscuro' || (t === 'auto' && mq().matches)
}

function aplicar(t: Tema): void {
  document.documentElement.classList.toggle('dark', esOscuro(t))
}

function leer(): Tema {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'claro' || v === 'oscuro' || v === 'auto') return v
  } catch {
    /* localStorage no disponible */
  }
  return 'auto'
}

interface TemaState {
  tema: Tema
  setTema: (t: Tema) => void
}

export const useTemaStore = create<TemaState>((set) => ({
  tema: leer(),
  setTema: (t) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* ignore */
    }
    aplicar(t)
    set({ tema: t })
  },
}))

// Reaplica al cargar y cuando cambia el tema del sistema (si está en "auto").
aplicar(useTemaStore.getState().tema)
mq().addEventListener('change', () => {
  if (useTemaStore.getState().tema === 'auto') aplicar('auto')
})
