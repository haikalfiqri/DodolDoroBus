/**
 * Daily quests. Which 3 quests a student gets is fixed per day; progress is computed from existing rows
 * (a good example of deriving data with SQL instead of keeping extra counters that can drift).
 */
import { pool, q, one, tx, kstDay, fail } from './db.js'
import { student, giveEgg } from './game.js'
import { weekStart } from './trial.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface QuestDef { id: string; text_ko: string; target: number; requires?: string }
let pool_: QuestDef[] | null = null
function questPool(): QuestDef[] {
  if (pool_) return pool_
  try { pool_ = JSON.parse(readFileSync(join(process.cwd(), 'content/quests_achievements.json'), 'utf8')).daily_quests_pool }
  catch { pool_ = null }
  return pool_ ??= [
    { id: 'feed_pet', text_ko: '펫에게 먹이 주기', target: 1 }, { id: 'clear_stage', text_ko: '스테이지 1개 클리어', target: 1 },
    { id: 'correct_any_5', text_ko: '정답 5개 맞히기', target: 5 }, { id: 'correct_digital_5', text_ko: '디지털 정답 5개', target: 5 },
    { id: 'correct_ai_5', text_ko: 'AI 정답 5개', target: 5 }, { id: 'correct_making_5', text_ko: '메이킹 정답 5개', target: 5 },
    { id: 'correct_computing_5', text_ko: '컴퓨팅 정답 5개', target: 5 }, { id: 'three_star', text_ko: '★★★ 클리어 1번', target: 1 },
    { id: 'weekly_trial', text_ko: '주간 시험 1번 도전', target: 1, requires: 'battle_room' },
  ]
}
const REWARD = 3

async function ensureToday(studentId: number): Promise<void> {
  const d = kstDay()
  const have = await one(pool, 'SELECT 1 FROM student_quests WHERE student_id=$1 AND day=$2', [studentId, d])
  if (have) return
  const s = await student(pool, studentId)
  const list = questPool().filter((x) => !x.requires || (x.requires === 'battle_room' && s.battle_room_unlocked_at))
  // deterministic shuffle by student + day, so a refresh never changes today's quests
  let seed = [...`${studentId}:${d}`].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32)
  const picked = [...list].sort(() => rnd() - 0.5).slice(0, 3)
  for (const x of picked) await pool.query('INSERT INTO student_quests (student_id, day, quest_id, target) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [studentId, d, x.id, x.target])
}

/** Today's progress for every quest type, in one query. */
async function progress(studentId: number): Promise<Record<string, number>> {
  const d = kstDay()
  const r = (await one(pool, `
    WITH t AS (SELECT category_id, is_correct FROM battle_turns WHERE student_id=$1 AND (created_at AT TIME ZONE 'Asia/Seoul')::date = $2)
    SELECT
      (SELECT count(*) FROM pets WHERE student_id=$1 AND last_fed_on=$2)::int AS feed_pet,
      (SELECT count(*) FROM battles WHERE student_id=$1 AND phase='WON' AND finished_at IS NOT NULL AND (finished_at AT TIME ZONE 'Asia/Seoul')::date=$2)::int AS clear_stage,
      (SELECT count(*) FROM battles WHERE student_id=$1 AND phase='WON' AND energy >= 80 AND finished_at IS NOT NULL AND (finished_at AT TIME ZONE 'Asia/Seoul')::date=$2)::int AS three_star,
      (SELECT count(*) FROM t WHERE is_correct)::int AS correct_any_5,
      (SELECT count(*) FROM t WHERE is_correct AND category_id='digital')::int AS correct_digital_5,
      (SELECT count(*) FROM t WHERE is_correct AND category_id='ai')::int AS correct_ai_5,
      (SELECT count(*) FROM t WHERE is_correct AND category_id='making')::int AS correct_making_5,
      (SELECT count(*) FROM t WHERE is_correct AND category_id='computing')::int AS correct_computing_5,
      (SELECT count(*) FROM trial_runs WHERE student_id=$1 AND finished_at IS NOT NULL AND (finished_at AT TIME ZONE 'Asia/Seoul')::date=$2)::int AS weekly_trial`, [studentId, d]))!
  return r
}

export async function list(studentId: number) {
  await ensureToday(studentId)
  const [rows, prog, stamp] = await Promise.all([
    q(pool, 'SELECT quest_id, target, claimed_at FROM student_quests WHERE student_id=$1 AND day=$2 ORDER BY quest_id', [studentId, kstDay()]),
    progress(studentId),
    one(pool, 'SELECT stamps, egg_given FROM quest_stamps WHERE student_id=$1 AND week_start=$2', [studentId, weekStart()]),
  ])
  const defs = Object.fromEntries(questPool().map((x) => [x.id, x]))
  return {
    reward: REWARD,
    quests: rows.map((r) => ({ id: r.quest_id, textKo: defs[r.quest_id]?.text_ko ?? r.quest_id, target: r.target, progress: Math.min(prog[r.quest_id] ?? 0, r.target), claimed: !!r.claimed_at })),
    stamps: stamp?.stamps ?? 0, stampsNeeded: 5, weeklyEggGiven: stamp?.egg_given ?? false,
  }
}

/** Claim one finished quest: reward mail (inside the daily cell cap); all 3 claimed = 1 stamp; 5 stamps = weekly egg. */
export async function claim(studentId: number, questId: string) {
  const prog = await progress(studentId)
  return tx(async (db) => {
    const d = kstDay()
    const row = (await one(db, 'SELECT * FROM student_quests WHERE student_id=$1 AND day=$2 AND quest_id=$3 FOR UPDATE', [studentId, d, questId])) ?? fail(404, 'no quest')
    if (row.claimed_at) fail(409, '이미 받았어요')
    if ((prog[questId] ?? 0) < row.target) fail(409, '아직 다 못 했어요')
    await db.query('UPDATE student_quests SET claimed_at=now() WHERE student_id=$1 AND day=$2 AND quest_id=$3', [studentId, d, questId])
    await db.query('INSERT INTO student_daily_limits (student_id, day) VALUES ($1,$2) ON CONFLICT DO NOTHING', [studentId, d])
    const lim = (await one(db, 'SELECT cells_earned FROM student_daily_limits WHERE student_id=$1 AND day=$2 FOR UPDATE', [studentId, d]))!
    const amount = Math.min(REWARD, 60 - lim.cells_earned)
    if (amount > 0) {
      await db.query('UPDATE student_daily_limits SET cells_earned=cells_earned+$3 WHERE student_id=$1 AND day=$2', [studentId, d, amount])
      await db.query(`INSERT INTO reward_mail (student_id, title, amount, source_ref) VALUES ($1,'[오늘의 퀘스트] 완료 보상',$2,$3)`, [studentId, amount, 'quest:' + questId])
    }
    let stamp = false, egg: string | null = null
    const left = (await one(db, 'SELECT count(*)::int n FROM student_quests WHERE student_id=$1 AND day=$2 AND claimed_at IS NULL', [studentId, d]))!.n
    if (left === 0) {
      stamp = true
      const w = weekStart()
      const st = (await one(db, `INSERT INTO quest_stamps (student_id, week_start, stamps) VALUES ($1,$2,1)
        ON CONFLICT (student_id, week_start) DO UPDATE SET stamps = LEAST(quest_stamps.stamps + 1, 7) RETURNING stamps, egg_given`, [studentId, w]))!
      if (st.stamps >= 5 && !st.egg_given) {
        const s = await student(db, studentId, true)
        egg = s.battle_room_unlocked_at ? 'uncommon' : 'common'
        await giveEgg(db, s, egg as 'common' | 'uncommon', 'QUEST', 'weekly:' + w)
        await db.query('UPDATE quest_stamps SET egg_given=true WHERE student_id=$1 AND week_start=$2', [studentId, w])
      }
    }
    return { cellsMailed: amount, stamp, weeklyEgg: egg }
  })
}
