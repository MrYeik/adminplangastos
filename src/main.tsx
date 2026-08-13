import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useConfigStore } from '@/store/configStore'
import { useCotizacionStore } from '@/store/cotizacionStore'

// Carga inicial de la configuración (crea la de por defecto si no existe).
useConfigStore.getState().cargar()
// Cotización del dólar oficial (BNA): usa la cacheada y refresca la de hoy.
useCotizacionStore.getState().asegurarHoy()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
