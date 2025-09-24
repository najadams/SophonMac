import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Explicitly set the port to ensure consistency
    host: '0.0.0.0', // Allow access from other machines on the network
    proxy: {
      '/api': {
        target: process.env.BACKEND_PORT ? `http://localhost:${process.env.BACKEND_PORT}` : 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
