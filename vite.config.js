import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prototypeApiPlugin from './vite-plugin-prototype-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prototypeApiPlugin()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
