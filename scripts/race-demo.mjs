// Concurrency demo: what happens when the SAME reward is claimed many times at the SAME moment?
//
// Part 1 – our real API: a new student gets one welcome mail (+20 cells), then we fire 10 claim
//          requests for it at once. Only one may succeed, and cell_ledger must have exactly one row.
// Part 2 – (needs DATABASE_URL) the same race on a "naive" design that checks first and updates later
//          (SELECT, then UPDATE). Run side by side with our design (one conditional UPDATE) to show why it matters.
//
// Usage (API must be running: npm run dev:api):
//   node scripts/race-demo.mjs                        -> part 1 only
//   DATABASE_URL=... node scripts/race-demo.mjs        -> part 1 + part 2
//   API=https://<preview-link> node scripts/race-demo.mjs
//
// Part 2 creates two small tables (race_demo_*) and drops them at the end. Use your OWN Neon branch, not main.
import pg from 'pg'

const API = process.env.API ?? 'http://localhost:3000'
const DB_URL = process.env.DATABASE_URL
const N = Number(process.env.N ?? 10)
const line = () => console.log('─'.repeat(60))

async function call(method, path, body, token) {
  const r = await fetch(API + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

/* ---------------- Part 1: the real API ---------------- */
line()
console.log(`PART 1 · Real API (${API}) · ${N} claims of the same mail at the same moment`)
line()

const username = 'race_' + Math.random().toString(36).slice(2, 8)
const reg = await call('POST', '/auth/register', { username, nickname: '레이스', password: 'race1234' })
if (reg.status !== 200) throw new Error('register failed: ' + JSON.stringify(reg.body))
const token = reg.body.token
await call('POST', '/onboarding', { petName: '레이스' }, token)

const before = (await call('GET', '/me', undefined, token)).body.cells
const mail = (await call('GET', '/mail', undefined, token)).body.find((m) => !m.claimed)
console.log(`student: ${username} · cells before: ${before} · mail #${mail.id} "${mail.title}" (+${mail.amount})\n`)

const results = await Promise.all(Array.from({ length: N }, () => call('POST', `/mail/${mail.id}/claim`, {}, token)))
results.forEach((r, i) => {
  const label = `  request ${String(i + 1).padStart(2)}:`
  console.log(r.status === 200 ? `${label} ✅ claimed +${r.body.claimed} → cells ${r.body.cells}` : `${label} ⛔ ${r.status} ${r.body.error ?? r.body.message ?? ''}`)
})

const after = (await call('GET', '/me', undefined, token)).body.cells
const wins = results.filter((r) => r.status === 200).length
console.log(`\nsuccessful claims: ${wins} (expected 1)`)
console.log(`cells: ${before} → ${after} (expected +${mail.amount}, got +${after - before})`)

let db
if (DB_URL) {
  db = new pg.Pool({ connectionString: DB_URL, max: N + 2, ssl: /host=\/|localhost/.test(DB_URL) ? false : { rejectUnauthorized: false } })
  const { rows } = await db.query(
    `SELECT count(*)::int n FROM cell_ledger l JOIN students s ON s.id = l.student_id WHERE s.username = $1 AND l.reason = 'MAIL_CLAIM'`, [username])
  console.log(`cell_ledger MAIL_CLAIM rows: ${rows[0].n} (expected 1)`)
}
console.log(wins === 1 && after - before === mail.amount ? '\nRESULT: ✅ safe – the reward was given exactly once' : '\nRESULT: ❌ the reward was given more than once!')

/* ---------------- Part 2: naive vs ours, straight on the database ---------------- */
if (!db) {
  console.log('\n(Set DATABASE_URL to also run part 2: naive design vs our design.)')
  process.exit(0)
}

line()
console.log(`PART 2 · Same race straight on PostgreSQL · naive design vs our design`)
line()

async function setup() {
  await db.query(`DROP TABLE IF EXISTS race_demo_mail, race_demo_wallet`)
  await db.query(`CREATE TABLE race_demo_wallet (id int PRIMARY KEY, cells int NOT NULL)`)
  await db.query(`CREATE TABLE race_demo_mail (id int PRIMARY KEY, amount int NOT NULL, claimed_at timestamptz)`)
  await db.query(`INSERT INTO race_demo_wallet VALUES (1, 0)`)
  await db.query(`INSERT INTO race_demo_mail VALUES (1, 20, NULL)`)
}

// NAIVE: read "is it claimed?", think for a moment, then write. Every request reads "not claimed yet".
async function naiveClaim() {
  const c = await db.connect()
  try {
    await c.query('BEGIN')
    const m = (await c.query('SELECT amount, claimed_at FROM race_demo_mail WHERE id = 1')).rows[0]
    if (m.claimed_at) { await c.query('ROLLBACK'); return false }
    await c.query('SELECT pg_sleep(0.2)')                       // the gap between checking and writing
    await c.query('UPDATE race_demo_wallet SET cells = cells + $1 WHERE id = 1', [m.amount])
    await c.query('UPDATE race_demo_mail SET claimed_at = now() WHERE id = 1')
    await c.query('COMMIT'); return true
  } finally { c.release() }
}

// OURS: check and write in ONE statement. Postgres row-locks the mail row, so only one UPDATE finds claimed_at IS NULL.
async function safeClaim() {
  const c = await db.connect()
  try {
    await c.query('BEGIN')
    const m = (await c.query('UPDATE race_demo_mail SET claimed_at = now() WHERE id = 1 AND claimed_at IS NULL RETURNING amount')).rows[0]
    if (!m) { await c.query('ROLLBACK'); return false }
    await c.query('SELECT pg_sleep(0.2)')                       // same gap, still safe
    await c.query('UPDATE race_demo_wallet SET cells = cells + $1 WHERE id = 1', [m.amount])
    await c.query('COMMIT'); return true
  } finally { c.release() }
}

async function race(name, fn) {
  await setup()
  const ok = (await Promise.all(Array.from({ length: N }, fn))).filter(Boolean).length
  const cells = (await db.query('SELECT cells FROM race_demo_wallet WHERE id = 1')).rows[0].cells
  console.log(`${name.padEnd(46)} successful claims: ${String(ok).padStart(2)} · wallet: ${String(cells).padStart(3)} cells ${cells === 20 ? '✅' : '❌ (should be 20)'}`)
}

await race('naive  (SELECT, then UPDATE)', naiveClaim)
await race('ours   (UPDATE ... WHERE claimed_at IS NULL)', safeClaim)
await db.query(`DROP TABLE IF EXISTS race_demo_mail, race_demo_wallet`)
await db.end()
