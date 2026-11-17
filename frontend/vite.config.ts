import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// The game data lives in ../content (shared with the backend seed scripts).
export default defineConfig({
  resolve: {
    alias: { '@content': fileURLToPath(new URL('../content', import.meta.url)) },
  },
  server: {
    fs: { allow: ['..'] },
    // When Akip's backend runs locally on :3000, /api calls go there (set VITE_USE_MOCK=false).
    proxy: { '/api': 'http://localhost:3000' },
  },
})
