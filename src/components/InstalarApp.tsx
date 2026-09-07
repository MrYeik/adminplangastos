import { useEffect, useState } from 'react'
import { Download, Share, Plus } from 'lucide-react'

// Evento no estándar de Chrome/Android para instalar la PWA.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function esStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

/**
 * Tarjeta para instalar la app en el teléfono.
 * - Android/Chrome de escritorio: botón que dispara el prompt nativo.
 * - iOS: instrucciones (Compartir → Agregar a inicio).
 * - Ya instalada: no muestra nada.
 */
export default function InstalarApp() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [instalada, setInstalada] = useState(esStandalone())
  const [ayudaIOS, setAyudaIOS] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalada = () => setInstalada(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalada)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalada)
    }
  }, [])

  // Ya está instalada / abierta como app → no mostrar nada.
  if (instalada) return null

  // No hay prompt nativo (típicamente iOS) y no es iOS → no ofrecemos nada
  // hasta que el navegador avise que se puede instalar.
  if (!prompt && !esIOS()) return null

  const instalar = async () => {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Download size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-800">Instalá la app en tu teléfono</div>
        <div className="text-sm text-slate-500">
          Queda con su ícono en la pantalla de inicio y se abre a pantalla completa, como una app.
        </div>
      </div>

      {prompt ? (
        <button
          onClick={instalar}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Instalar app
        </button>
      ) : (
        <button
          onClick={() => setAyudaIOS((v) => !v)}
          className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Cómo instalar
        </button>
      )}

      {ayudaIOS && !prompt && (
        <div className="w-full rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          En iPhone/iPad (Safari): tocá{' '}
          <Share size={15} className="mx-0.5 inline align-text-bottom text-brand-600" /> Compartir y
          después <span className="font-medium">“Agregar a inicio”</span>{' '}
          <Plus size={15} className="mx-0.5 inline align-text-bottom text-brand-600" />.
        </div>
      )}
    </div>
  )
}
