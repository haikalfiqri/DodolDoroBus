// Generates docs/erd/erd.mmd (Mermaid ER diagram) from the live schema: tables, columns, PKs and FKs.
// Usage: DATABASE_URL=... node scripts/erd.mjs && npx mmdc -i docs/erd/erd.mmd -o docs/erd/erd.png
import pg from 'pg'
import { writeFileSync } from 'node:fs'
const url = process.env.DATABASE_URL
const c = new pg.Client({ connectionString: url, ssl: /host=\/|localhost/.test(url) ? false : { rejectUnauthorized: false } })
await c.connect()
const cols = (await c.query(`SELECT table_name t, column_name col, data_type typ FROM information_schema.columns WHERE table_schema='public' AND table_name <> 'schema_migrations' ORDER BY table_name, ordinal_position`)).rows
const pks = new Set((await c.query(`SELECT kcu.table_name t, kcu.column_name col FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
  WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public'`)).rows.map((r) => r.t + '.' + r.col))
const fks = (await c.query(`SELECT kcu.table_name t, kcu.column_name col, ccu.table_name ft FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name
  WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'`)).rows
const fkSet = new Set(fks.map((f) => f.t + '.' + f.col))
const short = (t) => ({ 'character varying': 'text', 'timestamp with time zone': 'timestamptz', 'ARRAY': 'array', 'USER-DEFINED': 'enum' })[t] ?? t.replace(/ /g, '_')
let out = 'erDiagram\n'
// CORE=1: only the tables of the main game loop, with keys + the columns the transactions use
const CORE = process.env.CORE === '1'
const CORE_T = ['students', 'pets', 'pet_species', 'rarities', 'eggs', 'story_stages', 'stage_progress', 'battles', 'battle_turns', 'questions', 'reward_mail', 'cell_ledger', 'student_daily_limits']
const CORE_C = new Set(['cells', 'level', 'xp', 'is_partner', 'warmth', 'nest_slot', 'hatched_at', 'best_stars', 'phase', 'energy', 'gauge', 'combo', 'is_correct', 'status', 'mission_type_id', 'answer', 'amount', 'claimed_at', 'delta', 'balance', 'rewarded_battles', 'cells_earned', 'hatch_correct_needed', 'egg_slot', 'gauge'])
const tables = [...new Set(cols.map((r) => r.t))].filter((t) => !CORE || CORE_T.includes(t))
for (const t of tables) {
  out += `  ${t} {\n`
  for (const r of cols.filter((x) => x.t === t && (!CORE || pks.has(t + '.' + x.col) || fkSet.has(t + '.' + x.col) || CORE_C.has(x.col)))) {
    const k = [pks.has(t + '.' + r.col) ? 'PK' : '', fkSet.has(t + '.' + r.col) ? 'FK' : ''].filter(Boolean).join(',')
    out += `    ${short(r.typ)} ${r.col}${k ? ' ' + k : ''}\n`
  }
  out += '  }\n'
}
const seen = new Set()
for (const f of fks) {
  if (CORE && !(tables.includes(f.t) && tables.includes(f.ft))) continue
  const key = f.ft + '>' + f.t + '.' + f.col
  if (seen.has(key)) continue
  seen.add(key)
  out += `  ${f.ft} ||--o{ ${f.t} : "${f.col}"\n`
}
writeFileSync(CORE ? 'docs/erd/erd_core.mmd' : 'docs/erd/erd.mmd', out)
console.log(tables.length, 'tables,', seen.size, 'relationships')
await c.end()
