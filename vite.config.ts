import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Aura+ — Finanzas del Hogar',
        short_name: 'Aura+',
        description:
          'Administración y planificación financiera personal y familiar. Funciona sin conexión y guarda los datos en tu dispositivo.',
        lang: 'es-AR',
        theme_color: '#0d9488',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5_000_000,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5190,
    strictPort: true,
  },
})
