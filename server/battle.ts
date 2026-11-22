/**
 * Battle engine. The battle's whole state is a row in `battles`, so each request is independent
 * (works on serverless). Every endpoint locks that row (SELECT ... FOR UPDATE) inside a transaction,
 * so double-clicks or two tabs can never apply the same answer twice.
 */
import type { PoolClient } from 'pg'
import { q, one, tx, kstDay, fail } from './db.js'
import {
  content, stageOf, speciesOf, student, toPet, clearedSet, addXp, giveEgg, placeEgg, changeCells,
  pick, shuffle, type PetRow, type StageRow, type StudentRow,
} from './game.js'
import type * as T from '../src/types.js'

interface QRow { id: string; category_id: T.Category; mission_type_id: T.MissionType; prompt: string; payload: any; answer: any; explanation: string }
interface Current { q: string; order: number[] }
interface BattleRow {
  id: string; student_id: number; stage_id: string; pet_id: number; mode: T.BattleMode; phase: T.BattlePhase; round: number
  energy: number; max_energy: number; gauge: number; combo: number; combo_base: number; skill_id: string | null
  current: Current | null; used: string[]; correct: number; total: number; hint_used: boolean
  passive: { firstSkill?: boolean; missHalf?: boolean; dodgeSave?: boolean; revive?: boolean }; finished_at: string | null
  ghost_of: number | null; ghost_questions: string[] | null; ghost_score: number | null
}

async function lockBattle(db: PoolClient, id: string, studentId: number): Promise<BattleRow> {
  if (!/^[0-9a-f-]{36}$/.test(id)) fail(404, 'no battle')
  const b = await one<BattleRow>(db, 'SELECT * FROM battles WHERE id=$1 AND student_id=$2 FOR UPDATE', [id, studentId])
  return b ?? fail(404, 'no battle')
}
async function saveBattle(db: PoolClient, b: BattleRow): Promise<void> {
  await db.query(
    `UPDATE battles SET phase=$2, round=$3, energy=$4, gauge=$5, combo=$6, skill_id=$7, current=$8, used=$9, correct=$10, total=$11, hint_used=$12, passive=$13 WHERE id=$1`,
    [b.id, b.phase, b.round, b.energy, b.gauge, b.combo, b.skill_id, b.current ? JSON.stringify(b.current) : null, b.used, b.correct, b.total, b.hint_used, JSON.stringify(b.passive)],
  )
}
async function stateOf(db: PoolClient, b: BattleRow, st: StageRow, s?: StudentRow, p?: PetRow): Promise<T.BattleState> {
  const c = await content()
  s ??= await student(db, b.student_id)
  p ??= (await one<PetRow>(db, 'SELECT * FROM pets WHERE id=$1', [b.pet_id]))!
  return {
    battleId: b.id, stageId: st.id, mode: b.mode, phase: b.phase, round: b.round, maxRounds: st.max_rounds,
    energy: Math.max(0, b.energy), maxEnergy: b.max_energy, gauge: Math.max(0, b.gauge), maxGauge: st.gauge, combo: b.combo,
    pet: toPet(c, p, s, new Set(), true), ghost: b.ghost_of ? { nickname: (await one(db, 'SELECT nickname FROM students WHERE id=$1', [b.ghost_of]))?.nickname ?? '?', score: b.ghost_score ?? 0 } : null,   // in battle the mood is always "tense", so cleared stages are not needed
  }
}

/* ---------- questions: the server picks, shuffles and keeps the answer ---------- */
async function chooseQuestion(db: PoolClient, b: BattleRow, cat: T.Category | null, types: T.MissionType[]): Promise<{ row: QRow; cur: Current }> {
  // one query: approved, right type/category, not used in this battle, not among this student's last 50 answers
  const tryPick = async (typeList: T.MissionType[], useCat: boolean, avoidRecent: boolean): Promise<QRow | undefined> =>
    one<QRow>(db, `SELECT id, category_id, mission_type_id, prompt, payload, answer, explanation FROM questions
      WHERE status='approved' AND mission_type_id = ANY($1) AND ($2::text IS NULL OR category_id=$2) AND NOT (id = ANY($3))
        AND (NOT $4 OR id NOT IN (SELECT question_id FROM battle_turns WHERE student_id=$5 ORDER BY created_at DESC LIMIT 50))
      ORDER BY random() LIMIT 1`,
      [typeList, useCat ? cat : null, b.used, avoidRecent, b.student_id])
  const special = types.filter((t) => t !== 'choice4' && t !== 'ox')
  let row: QRow | undefined
  // ghost challenge: the friend's questions, in the same order
  if (b.ghost_questions && b.used.length < b.ghost_questions.length) {
    row = await one<QRow>(db, 'SELECT id, category_id, mission_type_id, prompt, payload, answer, explanation FROM questions WHERE id=$1', [b.ghost_questions[b.used.length]])
  }
  if (!row && special.length && Math.random() < 0.55) row = await tryPick(special, true, true)
  row ??= (await tryPick(types, true, true)) ?? (await tryPick(types, true, false)) ?? (await tryPick(['choice4', 'ox'], true, false)) ?? (await tryPick(['choice4', 'ox'], false, false))
  if (!row) fail(500, 'no approved questions: ask the admin to approve some')
  b.used = [...b.used, row.id]
  const n = row.payload?.choices?.length ?? row.payload?.items?.length ?? 0
  const order = row.mission_type_id === 'puzzle' ? [0, 1, 2, 3] : shuffle([...Array(n).keys()])
  return { row, cur: { q: row.id, order } }
}
function questionFor(c: Awaited<ReturnType<typeof content>>, b: BattleRow, row: QRow, cur: Current, s: StudentRow, pc: string | null): T.Question {
  let t = c.time[row.mission_type_id] ?? 20
  if (pc === 'order_time_plus_5' && (row.mission_type_id === 'order' || row.mission_type_id === 'command_order')) t += 5
  if (pc === 'all_time_plus_5') t += 5
  const P = row.payload ?? {}, o = cur.order
  let payload: T.QuestionPayload
  switch (row.mission_type_id) {
    case 'choice4': payload = { kind: 'choice4', choices: o.map((i) => P.choices[i]) }; break
    case 'ox': payload = { kind: 'ox' }; break
    case 'order': payload = { kind: 'order', items: o.map((i) => P.items[i]) }; break
    case 'command_order': payload = { kind: 'command_order', items: o.map((i) => P.items[i]) }; break
    case 'keyword': payload = { kind: 'keyword' }; break
    case 'pixel_art': payload = { kind: 'pixel_art', size: P.target.length, target: P.target }; break
    case 'puzzle': payload = { kind: 'puzzle', seq: P.seq, choices: P.choices }; break
    default: fail(500, 'unknown mission type')
  }
  return {
    id: row.id, category: row.category_id, missionType: row.mission_type_id, prompt: row.prompt, payload, timeLimitS: t,
    hintAvailable: s.unlocks.includes('hint') && !b.hint_used && (row.mission_type_id === 'choice4' || row.mission_type_id === 'puzzle'),
  }
}
/** Grade an answer. Returns [correct, correct answer in the positions the student saw]. */
function grade(row: QRow, order: number[], a: T.Answer): [boolean, T.Answer] {
  switch (row.mission_type_id) {
    case 'choice4': { const right = order.indexOf(Number(row.answer)); return [a === right, right] }
    case 'puzzle': return [a === row.answer, row.answer]
    case 'ox': return [a === row.answer, row.answer]
    case 'keyword': {
      const n = (s: unknown) => String(s).toLowerCase().replace(/\s+/g, '')
      const list = row.answer as string[]
      return [a !== null && list.some((x) => n(x) === n(a)), list[0]]
    }
    case 'order': case 'command_order': {
      const right = [...order.keys()].sort((x, y) => order[x] - order[y])
      return [Array.isArray(a) && a.length === right.length && a.every((v, i) => v === right[i]), right]
    }
    case 'pixel_art': {
      const right = (row.payload.target as string[]).join('').split('').map(Number)
      return [Array.isArray(a) && a.join('') === right.join(''), right]
    }
  }
  return [false, null]
}

/* ---------- endpoints ---------- */
export async function startBattle(studentId: number, req: T.StartBattleReq): Promise<T.StartBattleRes> {
  return tx(async (db) => {
    const c = await content()
    const s = await student(db, studentId, true)
    if (!s.onboarded_at) fail(409, 'finish onboarding first')
    const st = stageOf(c, req.stageId)
    const cleared = await clearedSet(db, studentId)
    if (st.ord > 1 && !cleared.has(`c${st.chapter_id}s${st.ord - 1}`)) fail(403, 'stage locked')
    let ghost: { id: number; questions: string[]; score: number } | null = null
    if (req.mode === 'GHOST') {
      if (!s.battle_room_unlocked_at) fail(403, '배틀룸은 1장 보스를 깨면 열려요')
      const f = (await one(db, `SELECT s.id, sp.best_score, sp.best_battle_id FROM students s JOIN friendships fr ON fr.friend_id = s.id AND fr.student_id = $1
        JOIN stage_progress sp ON sp.student_id = s.id AND sp.stage_id = $3 WHERE s.friend_code = $2`, [studentId, String(req.ghostOf ?? '').toUpperCase(), req.stageId])) ?? fail(404, '친구의 이 스테이지 기록이 없어요')
      const qs = (await q(db, 'SELECT question_id FROM battle_turns WHERE battle_id=$1 ORDER BY turn_no', [f.best_battle_id])).map((r) => r.question_id)
      if (!qs.length) fail(404, '친구 기록에 문제 목록이 없어요')
      ghost = { id: f.id, questions: qs, score: f.best_score }
    } else if (req.mode !== 'STORY') fail(501, 'mode not supported')
    const pet = (await one<PetRow>(db, 'SELECT * FROM pets WHERE id=$1 AND student_id=$2', [req.petId, studentId])) ?? fail(404, 'no pet')
    // the chosen pet becomes the partner (clear first, then set: keeps the one-partner index happy)
    await db.query('UPDATE pets SET is_partner=false WHERE student_id=$1 AND id<>$2', [studentId, pet.id])
    await db.query('UPDATE pets SET is_partner=true WHERE id=$1', [pet.id])
    const pc = speciesOf(c, pet.species_id).passive_code
    const maxE = pc === 'start_energy_110' ? 110 : 100
    const base = pc === 'combo_start_1_2' ? 1.2 : 1
    // close any unfinished battle (abandoned tab)
    await db.query(`UPDATE battles SET finished_at=now() WHERE student_id=$1 AND finished_at IS NULL`, [studentId])
    const b = (await one<BattleRow>(db,
      `INSERT INTO battles (student_id, stage_id, pet_id, mode, phase, energy, max_energy, gauge, combo, combo_base, passive, ghost_of, ghost_questions, ghost_score)
       VALUES ($1,$2,$3,$8,'PICK_SKILL',$4,$4,$5,$6,$6,$7,$9,$10,$11) RETURNING *`,
      [studentId, st.id, pet.id, maxE, st.gauge, base, JSON.stringify({ firstSkill: true, missHalf: pc === 'first_miss_half', dodgeSave: pc === 'dodge_save_once', revive: pc === 'revive_30_once' }),
        ghost ? 'GHOST' : 'STORY', ghost?.id ?? null, ghost?.questions ?? null, ghost?.score ?? null]))!
    const intro = cleared.has(st.id) || ghost ? [] : await q<T.DialogueLine>(db, `SELECT speaker, text FROM stage_dialogue WHERE stage_id=$1 AND moment='intro' ORDER BY seq`, [st.id])
    return { state: await stateOf(db, b, st, undefined, { ...pet, is_partner: true }), intro }
  })
}

export async function useSkill(studentId: number, battleId: string, skillId: string): Promise<T.SkillRes> {
  return tx(async (db) => {
    const c = await content()
    const b = await lockBattle(db, battleId, studentId)
    if (b.phase !== 'PICK_SKILL') fail(409, 'not your turn')
    const st = stageOf(c, b.stage_id)
    const s = await student(db, studentId)
    const p = (await one<PetRow>(db, 'SELECT * FROM pets WHERE id=$1', [b.pet_id]))!
    const sk = toPet(c, p, s, new Set()).skills.find((k) => k.id === skillId) ?? fail(400, 'skill not equipped')
    b.skill_id = skillId
    const { row, cur } = await chooseQuestion(db, b, sk.category, st.mission_types)
    b.current = cur
    b.phase = 'PET_QUESTION'
    await saveBattle(db, b)
    return { state: await stateOf(db, b, st, s, p), question: questionFor(c, b, row, cur, s, speciesOf(c, p.species_id).passive_code) }
  })
}

export async function answer(studentId: number, battleId: string, questionId: string, ans: T.Answer): Promise<T.AnswerRes> {
  return tx(async (db) => {
    const c = await content()
    const b = await lockBattle(db, battleId, studentId)
    if (b.phase !== 'PET_QUESTION' && b.phase !== 'ANOMALY_QUESTION') fail(409, 'no question open')
    if (!b.current || b.current.q !== questionId) fail(409, 'wrong question')
    const st = stageOf(c, b.stage_id)
    const s = await student(db, studentId)
    const row = (await one<QRow>(db, 'SELECT * FROM questions WHERE id=$1', [questionId]))!
    const [correct, correctAnswer] = grade(row, b.current.order, ans)
    const p = (await one<PetRow>(db, 'SELECT * FROM pets WHERE id=$1', [b.pet_id]))!
    const pc = speciesOf(c, p.species_id).passive_code
    const actor = b.phase === 'PET_QUESTION' ? 'PET' : 'ANOMALY'
    b.total++
    if (correct) {
      b.correct++
      // every correct answer warms every egg in the nest (capped at what it needs)
      await db.query(`UPDATE eggs e SET warmth = LEAST(e.warmth + 1, r.hatch_correct_needed) FROM rarities r
        WHERE e.rarity_id=r.id AND e.student_id=$1 AND e.nest_slot IS NOT NULL AND e.hatched_at IS NULL`, [studentId])
    }
    let effect: T.AnswerEffect
    let nextQuestion: T.Question | null = null
    if (b.phase === 'PET_QUESTION') {
      const sk = toPet(c, p, s, new Set()).skills.find((k) => k.id === b.skill_id)!
      if (correct) {
        const lion = b.passive.firstSkill && pc === 'first_skill_plus_30'
        const dmg = Math.round(sk.power * b.combo * (lion ? 1.3 : 1))
        b.gauge -= dmg
        effect = { kind: 'DAMAGE', amount: dmg, noteKo: `${sk.nameKo}! 게이지 -${dmg}${lion ? ' (왕의 포효 +30%)' : ''}` }
      } else effect = { kind: 'MISS', amount: 0, noteKo: '빗나갔어요. 게이지는 그대로예요' }
      b.combo = b.combo_base
      b.passive.firstSkill = false
      if (b.gauge <= 0) { b.phase = 'WON'; b.current = null }
      else {
        const dodgeTypes = st.mission_types.filter((t) => t === 'ox' || t === 'choice4')
        const { row: nq, cur } = await chooseQuestion(db, b, pick(st.categories), dodgeTypes.length ? dodgeTypes : ['ox', 'choice4'])
        b.current = cur
        b.phase = 'ANOMALY_QUESTION'
        nextQuestion = questionFor(c, b, nq, cur, s, pc)
      }
    } else {
      if (correct || b.passive.dodgeSave) {
        let note = ''
        if (!correct) { b.passive.dodgeSave = false; note = '⚖ 해치의 정의의 판정! ' }
        const step = (pc === 'dodge_combo_0_3' ? 0.3 : 0.2) * (pc === 'combo_double' ? 2 : 1)
        b.combo = Math.min(2, Math.round((b.combo + step) * 10) / 10)
        effect = { kind: 'DODGE', amount: b.combo, noteKo: `${note}회피 성공! 콤보 ×${b.combo.toFixed(1)}` }
      } else {
        let dmg = st.is_boss ? 20 : 15, note = ''
        if (b.passive.missHalf) { dmg = Math.round(dmg / 2); b.passive.missHalf = false; note = '🐼 느긋함: 절반만! ' }
        b.energy -= dmg
        if (b.energy <= 0 && b.passive.revive) { b.passive.revive = false; b.energy = 30; note += '🔥 봉황 부활! ' }
        effect = { kind: 'HIT', amount: dmg, noteKo: `${note}에너지 -${dmg}` }
      }
      if (b.energy <= 0 || b.round >= st.max_rounds) b.phase = 'LOST'
      else { b.round++; b.phase = 'PICK_SKILL' }
      b.current = null
    }
    await db.query(`INSERT INTO battle_turns (battle_id, student_id, turn_no, actor, skill_id, question_id, category_id, answer, is_correct, effect, amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [b.id, studentId, b.total, actor, actor === 'PET' ? b.skill_id : null, row.id, row.category_id, JSON.stringify(ans), correct, effect.kind, effect.amount])
    await saveBattle(db, b)
    return { correct, correctAnswer, explanation: row.explanation, effect, state: await stateOf(db, b, st, s, p), nextQuestion }
  })
}

export async function hint(studentId: number, battleId: string): Promise<T.HintRes> {
  return tx(async (db) => {
    const c = await content()
    const b = await lockBattle(db, battleId, studentId)
    const s = await student(db, studentId, true)
    if (!s.unlocks.includes('hint')) fail(403, 'hint opens after stage 2')
    if (b.hint_used || !b.current) fail(409, 'no hint available')
    const row = (await one<QRow>(db, 'SELECT * FROM questions WHERE id=$1', [b.current.q]))!
    if (row.mission_type_id !== 'choice4' && row.mission_type_id !== 'puzzle') fail(400, 'hint only for choice questions')
    const p = (await one<PetRow>(db, 'SELECT species_id FROM pets WHERE id=$1', [b.pet_id]))!
    const free = speciesOf(c, p.species_id).passive_code === 'free_hint_daily' && s.free_hint_day !== kstDay()
    let cells = s.cells
    if (free) await db.query('UPDATE students SET free_hint_day=$2 WHERE id=$1', [studentId, kstDay()])
    else if (s.cells < 3) fail(402, 'not enough cells')
    else cells = await changeCells(db, studentId, -3, 'HINT', b.id)
    b.hint_used = true
    await saveBattle(db, b)
    const rightShown = row.mission_type_id === 'choice4' ? b.current.order.indexOf(Number(row.answer)) : Number(row.answer)
    return { removeChoiceIndex: pick([0, 1, 2, 3].filter((i) => i !== rightShown)), cells }
  })
}

const UNLOCKS: Record<string, { add: string[]; ko: string[] }> = {
  c1s1: { add: ['room'], ko: ['🏠 마이룸이 열렸어요', '🛍 자일로 상점이 열렸어요'] },
  c1s2: { add: ['quests', 'hint'], ko: ['🔎 리코의 분석 (힌트)이 열렸어요'] },
  c1s3: { add: ['nest'], ko: ['🪺 둥지가 열렸어요: 맞힌 문제가 알을 따뜻하게 해요'] },
  c1s7: { add: ['battle_room'], ko: ['⚔ 배틀룸이 열렸어요', '🪺 둥지 2칸', '📖 2장이 곧 열려요'] },
}

/**
 * STAGE-CLEAR TRANSACTION. One BEGIN..COMMIT:
 * stars + stage_progress -> unlocks -> daily limits -> reward mail -> egg (first clear or replay roll + pity) -> partner XP/level.
 * If anything fails, none of it is saved.
 */
export async function finish(studentId: number, battleId: string): Promise<T.FinishRes> {
  return tx(async (db) => {
    const c = await content()
    const b = await lockBattle(db, battleId, studentId)
    if (b.phase !== 'WON' && b.phase !== 'LOST') fail(409, 'battle not over')
    if (b.finished_at) fail(409, 'already finished')
    await db.query('UPDATE battles SET finished_at=now() WHERE id=$1', [b.id])
    const s = await student(db, studentId, true)
    const st = stageOf(c, b.stage_id)
    const won = b.phase === 'WON', d = kstDay()
    const p = (await one<PetRow>(db, 'SELECT * FROM pets WHERE id=$1 FOR UPDATE', [b.pet_id]))!
    const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0
    const energy = Math.max(0, b.energy)
    const stars: T.Stars = !won ? 0 : energy >= 80 ? 3 : energy >= 50 ? 2 : 1
    // lock today's limits row (create it if missing)
    await db.query('INSERT INTO student_daily_limits (student_id, day) VALUES ($1,$2) ON CONFLICT DO NOTHING', [studentId, d])
    const lim = (await one(db, 'SELECT * FROM student_daily_limits WHERE student_id=$1 AND day=$2 FOR UPDATE', [studentId, d]))!
    const rewarded = won && lim.rewarded_battles < 10 && lim.cells_earned < 60
    const score = won ? energy * 10 + acc * 5 + Math.max(0, st.max_rounds - b.round) * 50 : 0   // faster clears (fewer rounds) score higher
    const res: T.FinishRes = {
      won, stars, xpGained: 0, levelUp: null, pet: null as unknown as T.Pet, cellsMailed: 0, firstClearOfDayBonus: false,
      practiceMode: won && !rewarded, egg: null, eggNoteKo: '', unlocksKo: [],
      record: { score, accuracy: acc, energyLeft: energy, isBest: false }, ghost: null, dialogue: [],
    }
    if (b.ghost_of) {
      // GHOST: compare scores; rewards 10 (win) / 3 (loss) cells, max 2 rewarded ghost battles per friend per day, inside the daily cap
      const theirs = b.ghost_score ?? 0, beat = score >= theirs   // a tie counts as beating the record
      res.ghost = { mine: score, theirs, won: beat }
      const today = (await one(db, `SELECT count(*)::int n FROM battles WHERE student_id=$1 AND ghost_of=$2 AND finished_at IS NOT NULL AND id<>$3
        AND (finished_at AT TIME ZONE 'Asia/Seoul')::date=$4`, [studentId, b.ghost_of, b.id, d]))!.n
      const amount = Math.min(beat ? 10 : 3, Math.max(0, 60 - lim.cells_earned))
      if (today < 2 && amount > 0) {
        await db.query('UPDATE student_daily_limits SET cells_earned=cells_earned+$3 WHERE student_id=$1 AND day=$2', [studentId, d, amount])
        const friend = (await one(db, 'SELECT nickname FROM students WHERE id=$1', [b.ghost_of]))!.nickname
        await db.query('INSERT INTO reward_mail (student_id, title, amount, source_ref) VALUES ($1,$2,$3,$4)', [studentId, `[배틀룸] ${friend}의 기록 도전 ${beat ? '승리' : '참가'}`, amount, b.id])
        res.cellsMailed = amount
      }
      res.practiceMode = false
      res.eggNoteKo = ''
    } else if (won) {
      const prev = await one(db, 'SELECT * FROM stage_progress WHERE student_id=$1 AND stage_id=$2', [studentId, st.id])
      const first = !prev
      res.record.isBest = first || score > prev.best_score
      if (first) await db.query('INSERT INTO stage_progress (student_id, stage_id, best_stars, best_score, best_battle_id) VALUES ($1,$2,$3,$4,$5)', [studentId, st.id, stars, score, b.id])
      else await db.query(`UPDATE stage_progress SET best_stars=GREATEST(best_stars,$3), clears=clears+1,
        best_score=GREATEST(best_score,$4), best_battle_id = CASE WHEN $4 > best_score THEN $5::uuid ELSE best_battle_id END WHERE student_id=$1 AND stage_id=$2`, [studentId, st.id, stars, score, b.id])
      if (first) {
        const u = UNLOCKS[st.id]
        if (u) {
          res.unlocksKo = u.ko
          s.unlocks = [...new Set([...s.unlocks, ...u.add])]
          if (st.id === 'c1s7') s.nest_slots = 2
          await db.query(`UPDATE students SET unlocks=$2, nest_slots=$3, battle_room_unlocked_at = CASE WHEN $4 THEN now() ELSE battle_room_unlocked_at END WHERE id=$1`,
            [studentId, s.unlocks, s.nest_slots, st.id === 'c1s7'])
          // eggs waiting in the box move into the newly opened nest
          for (const e of await q(db, 'SELECT id FROM eggs WHERE student_id=$1 AND hatched_at IS NULL AND nest_slot IS NULL ORDER BY id', [studentId])) await placeEgg(db, s, e.id)
        }
        res.dialogue = await q<T.DialogueLine>(db, `SELECT speaker, text FROM stage_dialogue WHERE stage_id=$1 AND moment='win' ORDER BY seq`, [st.id])
      }
      if (rewarded) {
        const base = st.is_boss ? 20 : [5, 10, 15][stars - 1]
        res.firstClearOfDayBonus = !lim.first_clear_bonus
        const amount = Math.min(base + (res.firstClearOfDayBonus ? 5 : 0), 60 - lim.cells_earned)
        await db.query('UPDATE student_daily_limits SET rewarded_battles=rewarded_battles+1, cells_earned=cells_earned+$3, first_clear_bonus=true WHERE student_id=$1 AND day=$2', [studentId, d, amount])
        if (amount > 0) {
          await db.query('INSERT INTO reward_mail (student_id, title, amount, source_ref) VALUES ($1,$2,$3,$4)',
            [studentId, `[코덱스의 시험] ${st.name_ko} ${'★'.repeat(stars)}${res.firstClearOfDayBonus ? ' + 오늘 첫 클리어' : ''}`, amount, b.id])
          res.cellsMailed = amount
        }
      }
      if (st.egg_slot) {
        if (first) {
          const rar = c.firstEggs.find((x) => x.chapter_id === st.chapter_id && x.slot === st.egg_slot)?.rarity_id
          if (rar) {
            const e = await giveEgg(db, s, rar, 'STORY', st.id)
            res.egg = { id: e.id, rarity: rar, source: 'STORY', inNest: e.inNest }
            res.eggNoteKo = '첫 클리어 보상 (확정)'
          }
        } else if (rewarded && stars >= 2) {
          // replay roll: walk mythic -> common adding percents; boss rolls feed Codex's favour (pity, 50)
          const rows = c.drops.filter((x) => x.chapter_id === st.chapter_id && x.slot === st.egg_slot)
          const r = Math.random() * 100
          let accp = 0, got: T.Rarity | null = null
          for (const rar of [...c.rarityOrder].reverse()) { const row = rows.find((x) => x.rarity_id === rar); if (!row) continue; accp += row.percent; if (r < accp) { got = rar; break } }
          let source: T.EggSource = 'REPLAY'
          if (st.is_boss) {
            if (got === 'mythic') s.mythic_pity = 0
            else if (++s.mythic_pity >= 50) { got = 'mythic'; source = 'PITY'; s.mythic_pity = 0 }
            await db.query('UPDATE students SET mythic_pity=$2 WHERE id=$1', [studentId, s.mythic_pity])
          }
          if (got) {
            const e = await giveEgg(db, s, got, source, st.id)
            res.egg = { id: e.id, rarity: got, source, inNest: e.inNest }
            res.eggNoteKo = source === 'PITY' ? '코덱스의 호의: 신화 확정!' : '다시 깨기 드롭!'
          } else res.eggNoteKo = `이번엔 알이 안 나왔어요 (알이 나올 확률 ${rows.reduce((a, x) => a + x.percent, 0)}%)`
        } else res.eggNoteKo = rewarded ? '★★ 이상이면 알이 나올 기회가 있어요' : '연습 모드에서는 알이 나오지 않아요'
      }
      if (stars === 3) await db.query('UPDATE students SET three_star_day=$2 WHERE id=$1', [studentId, d])
    } else {
      res.dialogue = await q<T.DialogueLine>(db, `SELECT speaker, text FROM stage_dialogue WHERE stage_id=$1 AND moment='lose' ORDER BY seq`, [st.id])
    }
    if (b.ghost_of) res.dialogue = [{ speaker: 'codex', text: res.ghost!.won ? '친구의 기록을 넘었군. 훌륭하다.' : '아깝다. 같은 문제로 다시 도전해 봐라.' }]
    let xp = won ? (st.is_boss ? 100 : 30 + 10 * stars) : 10
    if (p.last_fed_on === d) xp = Math.round(xp * (speciesOf(c, p.species_id).passive_code === 'food_xp_15' ? 1.15 : 1.1))
    res.xpGained = xp
    res.levelUp = await addXp(db, c, p, xp)
    const s2 = await student(db, studentId)
    res.pet = toPet(c, p, s2, await clearedSet(db, studentId))
    if (won && rewarded === false && !b.ghost_of) res.dialogue = [...res.dialogue, { speaker: 'naty', text: '오늘 정말 많이 했어! 이제 쉬었다가 내일 또 만나자. (오늘 보상은 모두 받았어)' }]
    return res
  })
}

