// Local API server: `npm run dev:api` (Vite proxies /api to it during `npm run dev`).
import app from './app.js'
const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`[api] http://localhost:${port}/api/health`))
