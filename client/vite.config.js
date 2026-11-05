import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api":API_BASE_URL,
    },
  },
})
