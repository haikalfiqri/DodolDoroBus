// Applies db/migrations/*.sql in order (each once), then seeds content/ and questions/ into the database.
// Runs on every Vercel build (npm run build) and locally with `npm run db:setup`.
// Safe to re-run: content is upserted, questions and demo accounts are only inserted if missing,
// so questions edited in the admin page are never overwritten.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scryptSync, randomBytes } from 'node:crypto'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) {
  console.log('[db] no DATABASE_URL: skipping migrate + seed')
  process.exit(0)
}
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(pw, salt, 32).toString('hex')}`
}

const PASSIVE_KO = {
  combo_start_1_2: '영리한 꼬리: 콤보가 ×1.2부터 시작해요',
  order_time_plus_5: '차례차례: 순서·명령 문제 시간 +5초',
  food_xp_15: '든든한 간식: 먹이 XP 보너스가 +15%',
  dodge_combo_0_3: '무리의 힘: 회피하면 콤보 +0.3',
  first_miss_half: '느긋함: 배틀마다 첫 오답은 에너지 절반만 줄어요',
  free_hint_daily: '높은 시야: 하루 1번 리코의 분석 무료',
  first_skill_plus_30: '왕의 포효: 배틀의 첫 스킬 위력 +30%',
  start_energy_110: '호랑이 기운: 에너지 110으로 시작',
  all_time_plus_5: '설원의 집중: 모든 문제 시간 +5초',
  dodge_save_once: '정의의 판정: 배틀마다 1번, 틀린 회피도 성공',
  revive_30_once: '불사의 불꽃: 배틀마다 1번, 쓰러지면 에너지 30으로 부활',
  combo_double: '구름의 흐름: 콤보가 2배로 빨리 올라요',
}
const MISSION_KO = { choice4: '4지선다', ox: 'O/X', order: '순서 맞추기', keyword: '키워드', command_order: '명령 블록', pixel_art: '픽셀 아트', puzzle: '패턴 퍼즐', rhythm: '리듬' }

// Content tables are only INSERTED by default, so numbers the admin changed in the game-settings page
// (gauges, egg rarities, drop rates, prices) survive a deploy. Run with RESEED_CONTENT=1 to overwrite them from content/.
const FORCE = process.env.RESEED_CONTENT === '1'
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1|\/tmp/.test(url) || url.includes('host=/') ? false : { rejectUnauthorized: false } })
await client.connect()
const q = (sql, params) => client.query(FORCE ? sql : sql.replace(/ON CONFLICT \(([^)]*)\) DO UPDATE SET[\s\S]*$/, 'ON CONFLICT ($1) DO NOTHING'), params)

// ---------- migrations ----------
await q(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
// a lock so two parallel builds never migrate at the same time
await q(`SELECT pg_advisory_lock(424242)`)
const done = new Set((await q(`SELECT name FROM schema_migrations`)).rows.map((r) => r.name))
for (const f of readdirSync(join(ROOT, 'db/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(f)) continue
  console.log('[db] applying', f)
  await q('BEGIN')
  try {
    await q(readFileSync(join(ROOT, 'db/migrations', f), 'utf8'))
    await q(`INSERT INTO schema_migrations(name) VALUES ($1)`, [f])
    await q('COMMIT')
  } catch (e) {
    await q('ROLLBACK')
    throw e
  }
}

// ---------- seed content (upsert) ----------
await q('BEGIN')
const cats = { digital: '디지털', ai: 'AI', making: '메이킹', computing: '컴퓨팅' }
for (const [id, ko] of Object.entries(cats))
  await q(`INSERT INTO question_categories VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name_ko=EXCLUDED.name_ko`, [id, ko])

for (const m of json('content/mission_types.json').mission_types)
  await q(`INSERT INTO mission_types VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET name_ko=EXCLUDED.name_ko, time_s=EXCLUDED.time_s`, [m.id, MISSION_KO[m.id] ?? m.id, m.time_s])

for (const e of json('content/eggs.json').eggs)
  await q(`INSERT INTO rarities VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET ord=EXCLUDED.ord, egg_name_ko=EXCLUDED.egg_name_ko, colour=EXCLUDED.colour, hatch_correct_needed=EXCLUDED.hatch_correct_needed`,
    [e.rarity, e.order, e.name_ko, e.colour, e.hatch_correct_needed])

for (const c of json('content/chapters.json').chapters) {
  await q(`INSERT INTO story_chapters VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET ord=EXCLUDED.ord, name_ko=EXCLUDED.name_ko, name_en=EXCLUDED.name_en, status=EXCLUDED.status, boss_mythic_percent=EXCLUDED.boss_mythic_percent`,
    [c.id, c.order, c.name_ko, c.name_en, c.status, c.boss_mythic_percent ?? 0])
  for (const [slot, rar] of Object.entries(c.first_clear_eggs ?? {})) {
    if (!rar) continue
    await q(`INSERT INTO chapter_first_clear_eggs VALUES ($1,$2,$3) ON CONFLICT (chapter_id, slot) DO UPDATE SET rarity_id=EXCLUDED.rarity_id`, [c.id, slot, rar])
  }
}

for (const s of json('content/stages.json').stages)
  await q(`INSERT INTO story_stages VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (id) DO UPDATE SET chapter_id=EXCLUDED.chapter_id, ord=EXCLUDED.ord, is_boss=EXCLUDED.is_boss, name_ko=EXCLUDED.name_ko,
      anomaly_ko=EXCLUDED.anomaly_ko, gauge=EXCLUDED.gauge, max_rounds=EXCLUDED.max_rounds, categories=EXCLUDED.categories,
      mission_types=EXCLUDED.mission_types, difficulty=EXCLUDED.difficulty, egg_slot=EXCLUDED.egg_slot`,
    [s.id, s.chapter, s.order, s.is_boss, s.name_ko, s.anomaly_ko, s.gauge, s.max_rounds, s.categories, s.mission_types, s.difficulty, s.egg_slot])

const dlg = json('content/dialogue/ch1.json')
await q(`DELETE FROM stage_dialogue WHERE stage_id LIKE 'c1s%'`)
for (const [stageId, moments] of Object.entries(dlg.stages))
  for (const [moment, lines] of Object.entries(moments))
    for (const [i, l] of lines.entries())
      await q(`INSERT INTO stage_dialogue VALUES ($1,$2,$3,$4,$5)`, [stageId, moment, i + 1, l.speaker, l.text])

for (const line of readFileSync(join(ROOT, 'content/egg_drop_rates.csv'), 'utf8').trim().split('\n').slice(1)) {
  const [ch, slot, rar, pct] = line.split(',')
  // chapters 2..5 exist as rows, so their rates can be stored too
  await q(`INSERT INTO egg_drop_rates VALUES ($1,$2,$3,$4) ON CONFLICT (chapter_id, slot, rarity_id) DO UPDATE SET percent=EXCLUDED.percent`, [Number(ch), slot, rar, Number(pct)])
}

for (const s of json('content/skills.json').skills)
  await q(`INSERT INTO skills VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name_ko=EXCLUDED.name_ko, category_id=EXCLUDED.category_id, kind=EXCLUDED.kind`, [s.id, s.name_ko, s.category, s.kind])

for (const p of json('content/pets.json').pets)
  await q(`INSERT INTO pet_species VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET rarity_id=EXCLUDED.rarity_id, name_ko=EXCLUDED.name_ko,
      type_id=EXCLUDED.type_id, signature_skill_id=EXCLUDED.signature_skill_id, passive_code=EXCLUDED.passive_code, passive_ko=EXCLUDED.passive_ko`,
    [p.id, p.rarity, p.name_ko, p.type, p.signature_skill, p.passive_code, p.passive_code ? PASSIVE_KO[p.passive_code] ?? p.passive : null])

for (const i of json('content/shop_items.json').items)
  await q(`INSERT INTO shop_items VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET name_ko=EXCLUDED.name_ko, kind=EXCLUDED.kind, price=EXCLUDED.price, effect=EXCLUDED.effect`,
    [i.id, i.name_ko, i.kind, i.price, i.effect ?? null])

for (const [k, v] of Object.entries(json('content/game_config.json')))
  await q(`INSERT INTO game_config VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [k, JSON.stringify(v)])

// ---------- questions: insert only new ids (admin edits are kept) ----------
let added = 0
for (const x of json('questions/questions.json')) {
  const r = await q(`INSERT INTO questions (id, category_id, difficulty, mission_type_id, prompt, payload, answer, explanation, status, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'seed') ON CONFLICT (id) DO NOTHING`,
    [x.id, x.cat, x.diff, x.type, x.prompt, x.payload == null ? null : JSON.stringify(x.payload), JSON.stringify(x.answer), x.ex ?? '', x.status ?? 'approved'])
  added += r.rowCount
}

// ---------- demo accounts ----------
const demo = [
  ['student1', '별빛코더', 'doro1234', 'STUDENT'],
  ['student2', '코딩고양이', 'doro1234', 'STUDENT'],
  ['admin', '도로 운영팀', 'admin1234', 'ADMIN'],
]
for (const [u, n, pw, role] of demo)
  await q(`INSERT INTO students (username, nickname, password_hash, role) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING`, [u, n, hashPassword(pw), role])

// every account gets a friend code (column added in migration 004)
const hasFc = (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='friend_code'`)).rowCount
if (hasFc) await q(`UPDATE students SET friend_code = upper(substr(md5(id::text || username), 1, 6)) WHERE friend_code IS NULL`)

await q('COMMIT')
await q(`SELECT pg_advisory_unlock(424242)`)
const counts = (await q(`SELECT (SELECT count(*) FROM questions) q, (SELECT count(*) FROM story_stages) s, (SELECT count(*) FROM pet_species) p, (SELECT count(*) FROM students) u`)).rows[0]
console.log(`[db] ready: ${counts.s} stages, ${counts.p} species, ${counts.q} questions (+${added} new), ${counts.u} accounts`)
await client.end()
