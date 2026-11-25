// Local API server: `npm run dev:api` (Vite proxies /api to it during `npm run dev`).
// Reads DATABASE_URL etc. from a local .env file if there is one (Vercel sets them itself).
try { process.loadEnvFile() } catch { /* no .env file: use the real environment */ }
export {}

// app is imported after .env is loaded, because server/db.ts reads DATABASE_URL when it loads
const { default: app } = await import('./app.js')
const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`[api] http://localhost:${port}/api/health`))
