import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/livrowitts/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
