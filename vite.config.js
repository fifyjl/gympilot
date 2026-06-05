import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fitnessApiPlugin } from './server/fitnessApi.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/gympolit/',
  plugins: [react(), fitnessApiPlugin()],
  server: {
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
})
