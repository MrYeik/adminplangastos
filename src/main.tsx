import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useConfigStore } from '@/store/configStore'

// Carga inicial de la configuración (crea la de por defecto si no existe).
useConfigStore.getState().cargar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
