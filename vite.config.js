import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // AGREGA ESTO AQUÍ ABAJO:
  preview: {
    allowedHosts: ['citywatchfrontend-production.up.railway.app']
  },
})