import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert(),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy all backend API routes through Vite so they work on HTTPS
      // (browsers block HTTP requests from HTTPS pages = "mixed content")
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/users': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/chats': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/messages': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/groups': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
    },
  },
})

