import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/lark-api': {
        target: 'https://open.larksuite.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lark-api/, '/open-apis'),
        secure: true,
      },
    },
  },
})
