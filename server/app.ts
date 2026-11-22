/**
 * Express 5 app: every route of the API contract (src/types.ts) plus login and admin.
 * Locally: `npm run dev:api` (port 3000). On Vercel: api/index.ts exports this app as one function.
 */
import express, { type Request, type Response, type NextFunction } from 'express'
import { pool, q, one, tx, kstDay, fail, HttpError } from './db.js'
import { needLogin, needAdmin, setSession, checkPassword, hashPassword } from './auth.js'
import {
  content, resetContent, student, limits, petsOf, petList, toPet, clearedSet, addXp, placeEgg, toEgg, changeCells, pick,
  type EggRow, type PetRow,
} from './game.js'
import * as battle from './battle.js'
import { selftest, playStage } from './selftest.js'
import * as trial from './trial.js'
import * as quests from './quests.js'
import { LAB, runLab } from './sqlLab.js'
import type * as T from '../src/types.js'

export const app = express()
app.use(express.json({ limit: '200kb' }))

const r = express.Router()
const id = (req: Request) => req.session!.id
const num = (v: unknown) => { const n = Number(v); if (!Number.isInteger(n)) fail(400, 'bad id'); return n }

/* ---------- health ---------- */
r.get('/health', async (_req, res) => {
  let db = false, questions = 0
  let pingMs = -1
  try {
    questions = (await one(pool, 'SELECT count(*)::int n FROM questions'))!.n; db = true
    const t = Date.now(); for (let i = 0; i < 5; i++) await pool.query('SELECT 1'); pingMs = Math.round((Date.now() - t) / 5)
  } catch { /* no db */ }
  res.json({ ok: true, db, questions, region: process.env.VERCEL_REGION ?? 'local', dbRegion: (() => { try { return new URL(process.env.DATABASE_URL ?? '').hostname.split('.').slice(1, 3).join('.') } catch { return '?' } })(), dbPingMs: pingMs, time: new Date().toISOString() })
})

r.get('/selftest', async (_req, res) => { res.json(await selftest()) })
// one-time: turns demo account student2 into a "mid-game" account (Chapter 1 cleared, eggs hatched) for presentations
r.get('/demo-setup', async (_req, res) => { res.json(await demoSetup()) })

/* ---------- auth ---------- */
r.post('/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  const s = await one(pool, 'SELECT id, role, password_hash FROM students WHERE username=$1', [String(username ?? '').trim().toLowerCase()])
  if (!s || !checkPassword(String(password ?? ''), s.password_hash)) fail(401, '아이디 또는 비밀번호가 틀렸어요')
  setSession(res, { id: s.id, role: s.role })
  res.json({ ok: true, role: s.role })
})
r.post('/auth/register', async (req, res) => {
  const username = String(req.body?.username ?? '').trim().toLowerCase()
  const nickname = String(req.body?.nickname ?? '').trim().slice(0, 12)
  const password = String(req.body?.password ?? '')
  if (!/^[a-z0-9_]{3,16}$/.test(username)) fail(400, '아이디는 영문 소문자·숫자 3~16자예요')
  if (password.length < 4) fail(400, '비밀번호는 4자 이상이에요')
  if (!nickname) fail(400, '닉네임을 입력해 주세요')
  const s = await one(pool, `INSERT INTO students (username, nickname, password_hash) VALUES ($1,$2,$3) ON CONFLICT (username) DO NOTHING RETURNING id, role`, [username, nickname, hashPassword(password)])
  if (!s) fail(409, '이미 있는 아이디예요')
  setSession(res, { id: s.id, role: s.role })
  res.json({ ok: true, role: s.role })
})
r.post('/auth/logout', (_req, res) => { setSession(res, null); res.json({ ok: true }) })

r.use(needLogin)

/* ---------- me & onboarding ---------- */
async function me(studentId: number): Promise<T.Me & { username: string; role: string }> {
  const c = await content()
  const [s, rows, cleared, lim, mail] = await Promise.all([
    student(pool, studentId), petsOf(pool, studentId), clearedSet(pool, studentId), limits(pool, studentId),
    one(pool, 'SELECT count(*)::int n FROM reward_mail WHERE student_id=$1 AND claimed_at IS NULL', [studentId]),
  ])
  const p = rows.find((x) => x.is_partner) ?? rows[0]
  return {
    username: s.username, role: s.role, nickname: s.nickname, cells: s.cells, unclaimedMail: mail!.n, onboarded: !!s.onboarded_at,
    partner: p ? toPet(c, p, s, cleared) : null, battleRoomUnlocked: !!s.battle_room_unlocked_at, mythicPity: s.mythic_pity, nestSlots: s.nest_slots,
    unlocked: { myRoom: s.unlocks.includes('room'), shop: s.unlocks.includes('room'), quests: s.unlocks.includes('quests'), hint: s.unlocks.includes('hint'), nest: s.unlocks.includes('nest') },
    today: { rewardedBattles: lim.rewarded_battles, cellsEarned: lim.cells_earned, firstClearBonusAvailable: !lim.first_clear_bonus },
  }
}
r.get('/me', async (req, res) => { res.json(await me(id(req))) })

r.post('/onboarding', async (req, res) => {
  const pet = await tx(async (db) => {
    const c = await content()
    const s = await student(db, id(req), true)
    if (s.onboarded_at) fail(409, 'already onboarded')
    // starter egg (Common) hatches with 3 taps: bag rule picks dog / cat / rabbit
    const sp = pick(c.species.filter((x) => x.rarity_id === 'common'))
    const name = String(req.body?.petName ?? '').trim().slice(0, 8) || sp.name_ko
    const egg = (await one(db, `INSERT INTO eggs (student_id, rarity_id, source, warmth, hatched_at) VALUES ($1,'common','STARTER',3,now()) RETURNING id`, [s.id]))!
    const p = (await one<PetRow>(db, `INSERT INTO pets (student_id, species_id, nickname, is_partner, born_on) VALUES ($1,$2,$3,true,$4) RETURNING *`, [s.id, sp.id, name, kstDay()]))!
    await db.query('UPDATE eggs SET hatched_pet_id=$2 WHERE id=$1', [egg.id, p.id])
    await db.query('UPDATE students SET onboarded_at=now() WHERE id=$1', [s.id])
    await db.query(`INSERT INTO reward_mail (student_id, title, amount, source_ref) VALUES ($1,'[코덱스] 도로랜드 입단 환영 선물',20,'onboarding')`, [s.id])
    return p
  })
  const m = await me(id(req))
  res.json({ me: m, pet: m.partner ?? pet })
})

/* ---------- chapters & stages ---------- */
r.get('/chapters', async (req, res) => {
  const c = await content()
  const cleared = await clearedSet(pool, id(req))
  res.json(c.chapters.map((ch) => {
    const st = c.stages.filter((s) => s.chapter_id === ch.id)
    return { id: ch.id, nameKo: ch.name_ko, status: ch.status, locked: ch.status !== 'playable', cleared: st.filter((s) => cleared.has(s.id)).length, total: st.length || 7 }
  }))
})
r.get('/chapters/:id/stages', async (req, res) => {
  const c = await content()
  const chId = num(req.params.id)
  const prog = new Map((await q(pool, 'SELECT stage_id, best_stars FROM stage_progress WHERE student_id=$1', [id(req)])).map((x) => [x.stage_id, x.best_stars]))
  res.json(c.stages.filter((s) => s.chapter_id === chId).map((s): T.StageSummary => ({
    id: s.id, chapterId: s.chapter_id, order: s.ord, isBoss: s.is_boss, nameKo: s.name_ko, anomalyKo: s.anomaly_ko, gauge: s.gauge, maxRounds: s.max_rounds,
    categories: s.categories, missionTypes: s.mission_types, difficulty: s.difficulty,
    locked: s.ord > 1 && !prog.has(`c${s.chapter_id}s${s.ord - 1}`), bestStars: (prog.get(s.id) ?? 0) as T.Stars, firstCleared: prog.has(s.id),
    eggSlot: s.egg_slot, firstClearEgg: s.egg_slot ? (c.firstEggs.find((x) => x.chapter_id === chId && x.slot === s.egg_slot)?.rarity_id ?? null) : null,
    dropRates: s.egg_slot ? c.drops.filter((d) => d.chapter_id === chId && d.slot === s.egg_slot).map((d) => ({ rarity: d.rarity_id, percent: d.percent })) : null,
  })))
})

/* ---------- battle ---------- */
r.post('/battles', async (req, res) => { res.json(await battle.startBattle(id(req), req.body)) })
r.post('/battles/:id/skill', async (req, res) => { res.json(await battle.useSkill(id(req), req.params.id, String(req.body?.skillId))) })
r.post('/battles/:id/answer', async (req, res) => { res.json(await battle.answer(id(req), req.params.id, String(req.body?.questionId), req.body?.answer ?? null)) })
r.post('/battles/:id/hint', async (req, res) => { res.json(await battle.hint(id(req), req.params.id)) })
r.post('/battles/:id/finish', async (req, res) => { res.json(await battle.finish(id(req), req.params.id)) })

/* ---------- pets ---------- */
r.get('/pets', async (req, res) => { res.json(await petList(pool, id(req))) })
r.patch('/pets/:id', async (req, res) => {
  const petId = num(req.params.id)
  await tx(async (db) => {
    const p = await one(db, 'SELECT id FROM pets WHERE id=$1 AND student_id=$2', [petId, id(req)])
    if (!p) fail(404, 'no pet')
    if (req.body?.isPartner) {
      await db.query('UPDATE pets SET is_partner=false WHERE student_id=$1 AND id<>$2', [id(req), petId])
      await db.query('UPDATE pets SET is_partner=true WHERE id=$1', [petId])
    }
    if (typeof req.body?.nickname === 'string') {
      const n = req.body.nickname.trim().slice(0, 8)
      if (n) await db.query('UPDATE pets SET nickname=$2 WHERE id=$1', [petId, n])
    }
  })
  const list = await petList(pool, id(req))
  res.json(req.body?.isPartner ? list : list.find((p) => p.id === petId))
})
r.post('/pets/:id/feed', async (req, res) => {
  const petId = num(req.params.id)
  const cells = await tx(async (db) => {
    const s = await student(db, id(req), true)
    if (!s.unlocks.includes('room')) fail(403, '먹이는 1스테이지를 깨면 열려요')
    const p = (await one(db, 'SELECT * FROM pets WHERE id=$1 AND student_id=$2 FOR UPDATE', [petId, s.id])) ?? fail(404, 'no pet')
    if (p.last_fed_on === kstDay()) fail(409, '오늘은 이미 먹었어요')
    let cells = s.cells
    const food = await one(db, `UPDATE student_items SET qty=qty-1 WHERE student_id=$1 AND item_id='pet_food' AND qty>0 RETURNING qty`, [s.id])
    if (!food) {
      if (s.cells < 5) fail(402, '셀이 부족해요 (5셀)')
      cells = await changeCells(db, s.id, -5, 'FEED', String(petId))
    }
    await db.query('UPDATE pets SET last_fed_on=$2 WHERE id=$1', [petId, kstDay()])
    return cells
  })
  res.json({ pet: (await petList(pool, id(req))).find((p) => p.id === petId), cells })
})

/* ---------- eggs & dex ---------- */
async function eggList(studentId: number): Promise<T.Egg[]> {
  const c = await content()
  return (await q<EggRow>(pool, 'SELECT * FROM eggs WHERE student_id=$1 AND hatched_at IS NULL ORDER BY nest_slot NULLS LAST, id', [studentId])).map((e) => toEgg(c, e))
}
r.get('/eggs', async (req, res) => { res.json(await eggList(id(req))) })
r.post('/eggs/:id/nest', async (req, res) => {
  await tx(async (db) => {
    const s = await student(db, id(req), true)
    const e = (await one(db, 'SELECT * FROM eggs WHERE id=$1 AND student_id=$2 AND hatched_at IS NULL', [num(req.params.id), s.id])) ?? fail(404, 'no egg')
    if (e.nest_slot === null && (await placeEgg(db, s, e.id)) === null) fail(409, '둥지가 꽉 찼거나 아직 열리지 않았어요')
  })
  res.json(await eggList(id(req)))
})
/** HATCH TRANSACTION: warmth check -> bag rule (no duplicates until the set is complete) -> new pet, or snack pack (+100 XP). */
async function hatchEgg(studentId: number, eggId: number): Promise<{ result: 'PET' | 'SNACK'; petId: number }> {
  return tx(async (db) => {
    const c = await content()
    const s = await student(db, studentId, true)
    const e = (await one(db, 'SELECT * FROM eggs WHERE id=$1 AND student_id=$2 AND hatched_at IS NULL FOR UPDATE', [eggId, s.id])) ?? fail(404, 'no egg')
    if (e.warmth < c.hatchNeed[e.rarity_id as T.Rarity]) fail(409, '아직 덜 따뜻해요')
    const cands = await q(db, `SELECT ps.id, ps.name_ko FROM pet_species ps WHERE ps.rarity_id=$2
      AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.student_id=$1 AND p.species_id=ps.id)`, [s.id, e.rarity_id])
    if (!cands.length) {
      const partner = (await one<PetRow>(db, 'SELECT * FROM pets WHERE student_id=$1 AND is_partner FOR UPDATE', [s.id]))!
      await addXp(db, c, partner, 100)
      await db.query('UPDATE eggs SET hatched_at=now(), became_snack=true, nest_slot=NULL WHERE id=$1', [e.id])
      return { result: 'SNACK' as const, petId: partner.id }
    }
    const sp = pick(cands)
    const p = (await one(db, 'INSERT INTO pets (student_id, species_id, nickname, born_on) VALUES ($1,$2,$3,$4) RETURNING id', [s.id, sp.id, sp.name_ko, kstDay()]))!
    await db.query('UPDATE eggs SET hatched_at=now(), hatched_pet_id=$2, nest_slot=NULL WHERE id=$1', [e.id, p.id])
    // the freed nest slot takes the next egg from the box
    const next = await one(db, 'SELECT id FROM eggs WHERE student_id=$1 AND hatched_at IS NULL AND nest_slot IS NULL ORDER BY id LIMIT 1', [s.id])
    if (next) await placeEgg(db, s, next.id)
    return { result: 'PET' as const, petId: p.id }
  })
}
r.post('/eggs/:id/hatch', async (req, res) => {
  const out = await hatchEgg(id(req), num(req.params.id))
  const pets = await petList(pool, id(req))
  const pet = pets.find((p) => p.id === out.petId)!
  res.json({ result: out.result, pet: out.result === 'PET' ? pet : null, snackXpTo: out.result === 'SNACK' ? pet : null } satisfies T.HatchRes)
})
r.get('/dex', async (req, res) => {
  const rows = await q(pool, `SELECT ps.id, ps.rarity_id, EXISTS (SELECT 1 FROM pets p WHERE p.student_id=$1 AND p.species_id=ps.id) owned
    FROM pet_species ps JOIN rarities r ON r.id=ps.rarity_id ORDER BY r.ord, ps.id`, [id(req)])
  res.json(rows.map((x) => ({ speciesId: x.id, rarity: x.rarity_id, owned: x.owned })))
})

/* ---------- mail (MAIL-CLAIM TRANSACTION) ---------- */
r.get('/mail', async (req, res) => {
  const rows = await q(pool, 'SELECT id, title, amount, created_at, claimed_at FROM reward_mail WHERE student_id=$1 ORDER BY claimed_at IS NOT NULL, created_at DESC LIMIT 50', [id(req)])
  res.json(rows.map((m) => ({ id: String(m.id), title: m.title, amount: m.amount, createdAt: m.created_at, claimed: !!m.claimed_at })))
})
async function claim(studentId: number, mailId: number | null): Promise<T.ClaimRes> {
  return tx(async (db) => {
    // "AND claimed_at IS NULL" + RETURNING: a second click finds nothing to claim, so cells can never be added twice
    const rows = await q(db, `UPDATE reward_mail SET claimed_at=now() WHERE student_id=$1 AND claimed_at IS NULL ${mailId === null ? '' : 'AND id=$2'} RETURNING id, amount`,
      mailId === null ? [studentId] : [studentId, mailId])
    if (!rows.length) fail(409, '이미 받았어요')
    let cells = (await student(db, studentId)).cells
    for (const m of rows) if (m.amount > 0) cells = await changeCells(db, studentId, m.amount, 'MAIL_CLAIM', String(m.id))
    return { claimed: rows.reduce((a, m) => a + m.amount, 0), cells }
  })
}
r.post('/mail/claim-all', async (req, res) => { res.json(await claim(id(req), null)) })
r.post('/mail/:id/claim', async (req, res) => { res.json(await claim(id(req), num(req.params.id))) })

/* ---------- shop ---------- */
const kindOf = (k: string): T.ShopItem['kind'] => (k === 'consumable' ? 'consumable' : k === 'pet_accessory' ? 'accessory' : k === 'battle_background' ? 'battle_background' : 'room')
r.get('/shop', async (req, res) => {
  const rows = await q(pool, `SELECT i.*, COALESCE(si.qty,0) owned FROM shop_items i LEFT JOIN student_items si ON si.item_id=i.id AND si.student_id=$1
    WHERE i.kind <> 'battle' ORDER BY i.price`, [id(req)])
  res.json(rows.map((i) => ({ id: i.id, nameKo: i.name_ko, kind: kindOf(i.kind), price: i.price, owned: i.owned, effect: i.effect })))
})
r.post('/shop/buy', async (req, res) => {
  const itemId = String(req.body?.itemId ?? '')
  const out = await tx(async (db) => {
    const s = await student(db, id(req), true)
    if (!s.unlocks.includes('room')) fail(403, '상점은 1스테이지를 깨면 열려요')
    const it = (await one(db, `SELECT * FROM shop_items WHERE id=$1 AND kind <> 'battle'`, [itemId])) ?? fail(404, 'no item')
    const owned = await one(db, 'SELECT qty FROM student_items WHERE student_id=$1 AND item_id=$2', [s.id, itemId])
    if (it.kind !== 'consumable' && owned?.qty) fail(409, '이미 가지고 있어요')
    if (s.cells < it.price) fail(402, '셀이 부족해요')
    const cells = await changeCells(db, s.id, -it.price, 'SHOP_BUY', itemId)
    await db.query('INSERT INTO student_items (student_id, item_id, qty) VALUES ($1,$2,1) ON CONFLICT (student_id, item_id) DO UPDATE SET qty=student_items.qty+1', [s.id, itemId])
    return cells
  })
  const items = await q(pool, `SELECT i.*, COALESCE(si.qty,0) owned FROM shop_items i LEFT JOIN student_items si ON si.item_id=i.id AND si.student_id=$1 WHERE i.id=$2`, [id(req), itemId])
  const i = items[0]
  res.json({ cells: out, item: { id: i.id, nameKo: i.name_ko, kind: kindOf(i.kind), price: i.price, owned: i.owned } })
})
r.get('/ledger', async (req, res) => {
  res.json(await q(pool, 'SELECT delta, reason, ref, balance, created_at FROM cell_ledger WHERE student_id=$1 ORDER BY id DESC LIMIT 30', [id(req)]))
})

/* ---------- daily quests ---------- */
r.get('/quests', async (req, res) => { res.json(await quests.list(id(req))) })
r.post('/quests/:id/claim', async (req, res) => { res.json(await quests.claim(id(req), String(req.params.id))) })

/* ---------- friends (ghost challenge) ---------- */
async function friendCode(studentId: number): Promise<string> {
  const r = await one(pool, `UPDATE students SET friend_code = COALESCE(friend_code, upper(substr(md5(id::text || username), 1, 6))) WHERE id=$1 RETURNING friend_code`, [studentId])
  return r!.friend_code
}
r.get('/friends', async (req, res) => {
  const me = id(req)
  const code = await friendCode(me)
  const friends = await q(pool, `SELECT s.nickname, s.friend_code,
      COALESCE(json_agg(json_build_object('stageId', sp.stage_id, 'score', sp.best_score, 'stars', sp.best_stars) ORDER BY sp.stage_id) FILTER (WHERE sp.stage_id IS NOT NULL), '[]') AS records
    FROM friendships f JOIN students s ON s.id = f.friend_id LEFT JOIN stage_progress sp ON sp.student_id = s.id AND sp.best_battle_id IS NOT NULL
    WHERE f.student_id = $1 GROUP BY s.id ORDER BY s.nickname`, [me])
  const mine = await q(pool, 'SELECT stage_id AS "stageId", best_score AS score, best_stars AS stars FROM stage_progress WHERE student_id=$1', [me])
  res.json({ code, friends, mine })
})
r.post('/friends', async (req, res) => {
  const code = String(req.body?.friendCode ?? '').trim().toUpperCase()
  const f = await one(pool, `SELECT id, nickname FROM students WHERE friend_code=$1 AND role='STUDENT'`, [code])
  if (!f) fail(404, '그런 친구 코드가 없어요')
  if (f.id === id(req)) fail(400, '내 코드예요!')
  // friendship goes both ways: two rows, one transaction
  await tx(async (db) => {
    await db.query('INSERT INTO friendships (student_id, friend_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING', [id(req), f.id])
  })
  res.json({ ok: true, nickname: f.nickname })
})

/* ---------- Battle Room · Weekly Trial ---------- */
r.get('/battle-room', async (req, res) => { res.json(await trial.lobby(id(req))) })
r.post('/trial/start', async (req, res) => { res.json(await trial.startRun(id(req))) })
r.post('/trial/:id/answer', async (req, res) => { res.json(await trial.answerRun(id(req), req.params.id, req.body?.answer ?? null)) })

/* ---------- Void's weekly report: accuracy per DIMC category, this week vs last week ---------- */
r.get('/report/weekly', async (req, res) => {
  res.json(await q(pool, `
    SELECT c.id AS category, c.name_ko,
      count(t.*) FILTER (WHERE t.created_at >= now() - interval '7 days')::int AS answered,
      COALESCE(round(100.0 * avg(t.is_correct::int) FILTER (WHERE t.created_at >= now() - interval '7 days')), 0)::int AS accuracy,
      COALESCE(round(100.0 * avg(t.is_correct::int) FILTER (WHERE t.created_at < now() - interval '7 days' AND t.created_at >= now() - interval '14 days')), 0)::int AS last_week
    FROM question_categories c LEFT JOIN battle_turns t ON t.category_id = c.id AND t.student_id = $1
    GROUP BY c.id, c.name_ko ORDER BY c.id`, [id(req)]))
})

/* ---------- report a question ---------- */
r.post('/questions/:id/report', async (req, res) => {
  const reason = String(req.body?.reason ?? '기타').slice(0, 100)
  const ok = await one(pool, 'INSERT INTO question_reports (question_id, student_id, reason) SELECT id, $2, $3 FROM questions WHERE id=$1 RETURNING id', [req.params.id, id(req), reason])
  if (!ok) fail(404, 'no question')
  res.json({ ok: true })
})

/* ---------- admin ---------- */
const a = express.Router()
a.use(needAdmin)
const STATUSES = ['draft', 'approved', 'hidden']
a.get('/questions', async (req, res) => {
  const { status, category, type, search } = req.query as Record<string, string | undefined>
  res.json(await q(pool, `SELECT q.*, (SELECT count(*)::int FROM question_reports r WHERE r.question_id=q.id AND NOT r.resolved) AS reports,
      (SELECT round(100.0*avg(t.is_correct::int))::int FROM battle_turns t WHERE t.question_id=q.id) AS accuracy,
      (SELECT count(*)::int FROM battle_turns t WHERE t.question_id=q.id) AS answered
    FROM questions q
    WHERE ($1::text IS NULL OR status=$1) AND ($2::text IS NULL OR category_id=$2) AND ($3::text IS NULL OR mission_type_id=$3)
      AND ($4::text IS NULL OR prompt ILIKE '%' || $4 || '%')
    ORDER BY CASE status WHEN 'draft' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC, id`,
  [status || null, category || null, type || null, search || null]))
})
function validQuestion(b: any) {
  const type = String(b.missionType ?? b.mission_type_id ?? '')
  const cat = String(b.category ?? b.category_id ?? '')
  if (!['digital', 'ai', 'making', 'computing'].includes(cat)) fail(400, '분야를 골라 주세요')
  if (!['choice4', 'ox', 'order', 'keyword', 'command_order', 'pixel_art', 'puzzle'].includes(type)) fail(400, '유형을 골라 주세요')
  const prompt = String(b.prompt ?? '').trim()
  if (!prompt) fail(400, '문제를 입력해 주세요')
  let payload: any = null, answer: any = null
  if (type === 'choice4') {
    const ch = (b.choices ?? []).map((x: unknown) => String(x).trim()).filter(Boolean)
    if (ch.length !== 4) fail(400, '보기 4개가 필요해요')
    payload = { choices: ch }; answer = Number(b.answer ?? 0)
    if (!(answer >= 0 && answer < 4)) fail(400, '정답 번호가 잘못됐어요')
  } else if (type === 'ox') { answer = b.answer === 'X' ? 'X' : 'O' }
  else if (type === 'order' || type === 'command_order') {
    const items = (b.items ?? []).map((x: unknown) => String(x).trim()).filter(Boolean)
    if (items.length < 3) fail(400, '단계는 3개 이상이에요 (정답 순서대로)')
    payload = { items }
  } else if (type === 'keyword') {
    const list = (b.answers ?? []).map((x: unknown) => String(x).trim()).filter(Boolean)
    if (!list.length) fail(400, '정답 단어를 입력해 주세요')
    answer = list
  } else if (type === 'pixel_art') {
    const target = (b.target ?? []).map((x: unknown) => String(x).trim())
    if (!target.length || target.some((r: string) => !/^[01]+$/.test(r) || r.length !== target.length)) fail(400, '정사각형 0/1 그림이 필요해요')
    payload = { target }
  } else if (type === 'puzzle') {
    const seq = (b.seq ?? []).map((x: unknown) => String(x).trim()).filter(Boolean)
    const ch = (b.choices ?? []).map((x: unknown) => String(x).trim()).filter(Boolean)
    if (ch.length !== 4 || !seq.length) fail(400, '수열과 보기 4개가 필요해요')
    payload = { seq, choices: ch }; answer = Number(b.answer ?? 0)
  }
  const status = STATUSES.includes(b.status) ? b.status : 'draft'
  const difficulty = ['easy', 'normal', 'hard'].includes(b.difficulty) ? b.difficulty : 'easy'
  return { type, cat, prompt, payload, answer, status, difficulty, explanation: String(b.explanation ?? '').trim() }
}
a.post('/questions', async (req, res) => {
  const v = validQuestion(req.body ?? {})
  const s = await student(pool, id(req))
  res.json(await one(pool, `INSERT INTO questions (category_id, difficulty, mission_type_id, prompt, payload, answer, explanation, status, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
  [v.cat, v.difficulty, v.type, v.prompt, v.payload && JSON.stringify(v.payload), JSON.stringify(v.answer), v.explanation, v.status, s.username]))
})
a.put('/questions/:id', async (req, res) => {
  const v = validQuestion(req.body ?? {})
  const row = await one(pool, `UPDATE questions SET category_id=$2, difficulty=$3, mission_type_id=$4, prompt=$5, payload=$6, answer=$7, explanation=$8, status=$9, updated_at=now()
    WHERE id=$1 RETURNING *`, [req.params.id, v.cat, v.difficulty, v.type, v.prompt, v.payload && JSON.stringify(v.payload), JSON.stringify(v.answer), v.explanation, v.status])
  res.json(row ?? fail(404, 'no question'))
})
a.post('/questions/:id/status', async (req, res) => {
  const st = String(req.body?.status)
  if (!STATUSES.includes(st)) fail(400, 'bad status')
  const row = await one(pool, 'UPDATE questions SET status=$2, updated_at=now() WHERE id=$1 RETURNING id, status', [req.params.id, st])
  res.json(row ?? fail(404, 'no question'))
})
a.get('/reports', async (_req, res) => {
  res.json(await q(pool, `SELECT r.id, r.reason, r.created_at, r.question_id, q.prompt, s.nickname FROM question_reports r
    JOIN questions q ON q.id=r.question_id JOIN students s ON s.id=r.student_id WHERE NOT r.resolved ORDER BY r.created_at DESC`))
})
a.post('/reports/:id/resolve', async (req, res) => {
  await pool.query('UPDATE question_reports SET resolved=true WHERE id=$1', [num(req.params.id)])
  res.json({ ok: true })
})
/** Dashboard numbers for the admin page, each one a plain SQL query (good for the DB presentation). */
a.get('/stats', async (_req, res) => {
  const [totals, byCat, hardest, students] = await Promise.all([
    one(pool, `SELECT (SELECT count(*) FROM students WHERE role='STUDENT')::int students,
      (SELECT count(*) FROM questions WHERE status='approved')::int approved, (SELECT count(*) FROM questions WHERE status='draft')::int drafts,
      (SELECT count(*) FROM question_reports WHERE NOT resolved)::int reports, (SELECT count(*) FROM battles)::int battles,
      (SELECT count(*) FROM battle_turns)::int answers, (SELECT count(*) FROM pets)::int pets,
      (SELECT count(*) FROM eggs WHERE hatched_at IS NOT NULL AND NOT became_snack)::int hatched`),
    q(pool, `SELECT c.name_ko, count(q.*) FILTER (WHERE q.status='approved')::int approved,
      COALESCE((SELECT round(100.0*avg(t.is_correct::int))::int FROM battle_turns t WHERE t.category_id=c.id),0) accuracy
      FROM question_categories c LEFT JOIN questions q ON q.category_id=c.id GROUP BY c.id, c.name_ko ORDER BY c.id`),
    q(pool, `SELECT q.id, q.prompt, count(*)::int answered, round(100.0*avg(t.is_correct::int))::int accuracy
      FROM battle_turns t JOIN questions q ON q.id=t.question_id GROUP BY q.id, q.prompt HAVING count(*) >= 2 ORDER BY accuracy, answered DESC LIMIT 5`),
    q(pool, `SELECT s.nickname, s.username, s.cells, count(DISTINCT sp.stage_id)::int stages, (SELECT count(*) FROM pets p WHERE p.student_id=s.id)::int pets
      FROM students s LEFT JOIN stage_progress sp ON sp.student_id=s.id WHERE s.role='STUDENT' GROUP BY s.id ORDER BY stages DESC, s.id LIMIT 20`),
  ])
  res.json({ totals, byCat, hardest, students })
})
a.get('/sql', (_req, res) => { res.json(LAB.map(({ id, title, why, sql }) => ({ id, title, why, sql }))) })
a.get('/sql/:id', async (req, res) => { res.json((await runLab(String(req.params.id))) ?? fail(404, 'no query')) })
/* game settings: stages, first-clear eggs, drop rates, shop prices (operator edits without code) */
a.get('/settings', async (_req, res) => {
  const [stages, eggs, drops, shop, rarities] = await Promise.all([
    q(pool, `SELECT s.id, s.name_ko, s.anomaly_ko, s.gauge, s.max_rounds, s.egg_slot, s.is_boss, f.rarity_id AS first_egg
      FROM story_stages s LEFT JOIN chapter_first_clear_eggs f ON f.chapter_id = s.chapter_id AND f.slot = s.egg_slot WHERE s.chapter_id = 1 ORDER BY s.ord`),
    q(pool, 'SELECT * FROM chapter_first_clear_eggs WHERE chapter_id = 1'),
    q(pool, `SELECT d.* FROM egg_drop_rates d JOIN rarities r ON r.id = d.rarity_id WHERE chapter_id = 1 ORDER BY slot, r.ord`),
    q(pool, `SELECT id, name_ko, kind, price FROM shop_items ORDER BY price`),
    q(pool, 'SELECT id FROM rarities ORDER BY ord'),
  ])
  res.json({ stages, eggs, drops, shop, rarities: rarities.map((x) => x.id) })
})
a.put('/settings/stages/:id', async (req, res) => {
  const g = Number(req.body?.gauge), r = Number(req.body?.maxRounds)
  if (!(g >= 10 && g <= 300) || !(r >= 1 && r <= 10)) fail(400, '게이지 10~300, 라운드 1~10')
  const row = await one(pool, 'UPDATE story_stages SET gauge=$2, max_rounds=$3 WHERE id=$1 RETURNING id', [req.params.id, g, r])
  if (!row) fail(404, 'no stage')
  resetContent(); res.json({ ok: true })
})
a.put('/settings/first-egg', async (req, res) => {
  await pool.query('UPDATE chapter_first_clear_eggs SET rarity_id=$3 WHERE chapter_id=$1 AND slot=$2', [1, String(req.body?.slot), String(req.body?.rarity)])
  resetContent(); res.json({ ok: true })
})
a.put('/settings/drop', async (req, res) => {
  const pct = Number(req.body?.percent)
  if (!(pct >= 0 && pct <= 100)) fail(400, '0~100%')
  await pool.query(`INSERT INTO egg_drop_rates VALUES (1,$1,$2,$3) ON CONFLICT (chapter_id, slot, rarity_id) DO UPDATE SET percent=EXCLUDED.percent`, [String(req.body?.slot), String(req.body?.rarity), pct])
  const total = (await one(pool, 'SELECT sum(percent)::float t FROM egg_drop_rates WHERE chapter_id=1 AND slot=$1', [String(req.body?.slot)]))!.t
  if (total > 100) { await pool.query('UPDATE egg_drop_rates SET percent=0 WHERE chapter_id=1 AND slot=$1 AND rarity_id=$2', [String(req.body?.slot), String(req.body?.rarity)]); fail(400, '한 슬롯의 합계가 100%를 넘을 수 없어요') }
  resetContent(); res.json({ ok: true })
})
a.put('/settings/shop/:id', async (req, res) => {
  const price = Number(req.body?.price)
  if (!(price >= 0 && price <= 999)) fail(400, '가격 0~999')
  const row = await one(pool, 'UPDATE shop_items SET price=$2 WHERE id=$1 RETURNING id', [req.params.id, price])
  if (!row) fail(404, 'no item')
  res.json({ ok: true })
})
r.use('/admin', a)

app.use('/api', r)
app.use('/api', (_req, res) => { res.status(404).json({ error: 'not found' }) })

// errors: HttpError -> its status; Postgres CHECK violations -> 400; anything else -> 500
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return }
  const pgErr = err as { code?: string; message?: string }
  if (pgErr?.code === '23514' || pgErr?.code === '23505') { res.status(400).json({ error: '데이터 규칙에 맞지 않아요: ' + pgErr.message }); return }
  console.error(err)
  res.status(500).json({ error: 'server error' })
})

async function demoSetup() {
  const s = await one(pool, `SELECT id, onboarded_at FROM students WHERE username='student2'`)
  if (!s) fail(404, 'no student2')
  if (s.onboarded_at) return { ok: true, note: 'student2 is already set up' }
  const sp = 'cat'
  await tx(async (db) => {
    const p = (await one(db, `INSERT INTO pets (student_id, species_id, nickname, is_partner, born_on) VALUES ($1,$2,'나비',true,$3) RETURNING id`, [s.id, sp, kstDay(-3)]))!
    await db.query(`INSERT INTO eggs (student_id, rarity_id, source, warmth, hatched_at, hatched_pet_id) VALUES ($1,'common','STARTER',3,now(),$2)`, [s.id, p.id])
    await db.query('UPDATE students SET onboarded_at=now() WHERE id=$1', [s.id])
    await db.query(`INSERT INTO reward_mail (student_id, title, amount, source_ref) VALUES ($1,'[코덱스] 도로랜드 입단 환영 선물',20,'onboarding')`, [s.id])
  })
  const log: string[] = []
  for (const st of ['c1s1', 'c1s2', 'c1s3', 'c1s4', 'c1s5', 'c1s6', 'c1s7']) {
    log.push(await playStage(s.id, st))
    for (const e of await q(pool, `SELECT e.id FROM eggs e JOIN rarities r ON r.id=e.rarity_id WHERE e.student_id=$1 AND e.hatched_at IS NULL AND e.warmth >= r.hatch_correct_needed`, [s.id])) {
      const h = await hatchEgg(s.id, e.id); log.push('hatched ' + h.result)
    }
  }
  await claim(s.id, null).catch(() => null)
  return { ok: true, log }
}

export default app
