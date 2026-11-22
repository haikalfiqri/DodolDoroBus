/**
 * Battle Room · Weekly Trial. Same 8 questions for every student this week; score =
 * correct x 100 + time bonus (seconds left x 5) + combo bonus (best combo x 50). Best run counts.
 */
import { pool, q, one, tx, kstDay, fail } from './db.js'
import { student, shuffle } from './game.js'
import type * as T from '../src/types.js'

const N = 8, LIMIT_S = 20
export function weekStart(): string {
  const d = new Date(kstDay() + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  return new Date(d.getTime() - dow * 864e5).toISOString().slice(0, 10)
}
async function ensureWeek(): Promise<{ week_start: string; question_ids: string[] }> {
  const w = weekStart()
  const have = await one(pool, 'SELECT * FROM weekly_trials WHERE week_start=$1', [w])
  if (have) return have
  // 2 per DIMC category, 4-choice or O/X only (fair and fast)
  const ids = (await q(pool, `SELECT id FROM (SELECT id, category_id, row_number() OVER (PARTITION BY category_id ORDER BY random()) rn
      FROM questions WHERE status='approved' AND mission_type_id IN ('choice4','ox')) x WHERE rn <= 2 ORDER BY random()`)).map((r) => r.id)
  await pool.query('INSERT INTO weekly_trials (week_start, question_ids) VALUES ($1,$2) ON CONFLICT DO NOTHING', [w, ids.slice(0, N)])
  return (await one(pool, 'SELECT * FROM weekly_trials WHERE week_start=$1', [w]))!
}

export interface TrialQuestion { index: number; total: number; question: T.Question }
async function questionAt(week: { question_ids: string[] }, idx: number): Promise<{ q: T.Question; order: number[] }> {
  const row = (await one(pool, 'SELECT * FROM questions WHERE id=$1', [week.question_ids[idx]]))!
  const order = row.mission_type_id === 'choice4' ? shuffle([0, 1, 2, 3]) : [0, 1]
  const payload: T.QuestionPayload = row.mission_type_id === 'choice4' ? { kind: 'choice4', choices: order.map((i: number) => row.payload.choices[i]) } : { kind: 'ox' }
  return { order, q: { id: row.id, category: row.category_id, missionType: row.mission_type_id, prompt: row.prompt, payload, timeLimitS: LIMIT_S, hintAvailable: false } }
}

export async function lobby(studentId: number) {
  const s = await student(pool, studentId)
  const w = weekStart()
  const unlocked = !!s.battle_room_unlocked_at
  const top = await q(pool, `SELECT s.nickname, max(r.score)::int AS score, (s.id = $2) AS me FROM trial_runs r JOIN students s ON s.id = r.student_id
    WHERE r.week_start=$1 AND r.finished_at IS NOT NULL GROUP BY s.id, s.nickname ORDER BY score DESC LIMIT 10`, [w, studentId])
  const mine = await one(pool, `SELECT max(score)::int best, count(*)::int runs FROM trial_runs WHERE week_start=$1 AND student_id=$2 AND finished_at IS NOT NULL`, [w, studentId])
  const rank = mine?.best == null ? null : (await one(pool, `SELECT count(*)::int + 1 AS r FROM (SELECT student_id, max(score) sc FROM trial_runs WHERE week_start=$1 AND finished_at IS NOT NULL GROUP BY student_id) t WHERE sc > $2`, [w, mine.best]))!.r
  return { unlocked, weekStart: w, questions: N, timeLimitS: LIMIT_S, myBest: mine?.best ?? null, myRuns: mine?.runs ?? 0, myRank: rank, top }
}

export async function startRun(studentId: number): Promise<{ runId: string } & TrialQuestion> {
  const s = await student(pool, studentId)
  if (!s.battle_room_unlocked_at) fail(403, '배틀룸은 1장 보스를 깨면 열려요')
  const week = await ensureWeek()
  const first = await questionAt(week, 0)
  const run = (await one(pool, `INSERT INTO trial_runs (student_id, week_start, q_order, q_started_at) VALUES ($1,$2,$3,now()) RETURNING id`, [studentId, week.week_start, JSON.stringify(first.order)]))!
  return { runId: run.id, index: 0, total: week.question_ids.length, question: first.q }
}

export async function answerRun(studentId: number, runId: string, ans: T.Answer) {
  if (!/^[0-9a-f-]{36}$/.test(runId)) fail(404, 'no run')
  return tx(async (db) => {
    const r = (await one(db, 'SELECT r.*, extract(epoch FROM now() - q_started_at) AS elapsed FROM trial_runs r WHERE id=$1 AND student_id=$2 FOR UPDATE', [runId, studentId])) ?? fail(404, 'no run')
    if (r.finished_at) fail(409, 'already finished')
    const week = (await one(db, 'SELECT * FROM weekly_trials WHERE week_start=$1', [r.week_start]))!
    const row = (await one(db, 'SELECT * FROM questions WHERE id=$1', [week.question_ids[r.idx]]))!
    const order: number[] = r.q_order
    const right: T.Answer = row.mission_type_id === 'choice4' ? order.indexOf(Number(row.answer)) : row.answer
    const left = Math.max(0, LIMIT_S - Math.floor(Number(r.elapsed)))   // timed by the server, not the browser
    const correct = ans === right && left > 0
    let { correct: nCorrect, combo, best_combo: best, time_bonus: tb } = r
    if (correct) { nCorrect++; tb += left * 5; combo = Math.min(2, Math.round((combo + 0.2) * 10) / 10); best = Math.max(best, combo) } else combo = 1
    const score = nCorrect * 100 + tb + Math.round(best * 50)
    const idx = r.idx + 1
    const done = idx >= week.question_ids.length
    let next: TrialQuestion | null = null
    if (!done) {
      const nq = await questionAt(week, idx)
      next = { index: idx, total: week.question_ids.length, question: nq.q }
      await db.query('UPDATE trial_runs SET idx=$2, q_order=$3, q_started_at=now(), correct=$4, combo=$5, best_combo=$6, time_bonus=$7, score=$8 WHERE id=$1',
        [runId, idx, JSON.stringify(nq.order), nCorrect, combo, best, tb, score])
    } else {
      await db.query('UPDATE trial_runs SET idx=$2, correct=$3, combo=$4, best_combo=$5, time_bonus=$6, score=$7, finished_at=now() WHERE id=$1', [runId, idx, nCorrect, combo, best, tb, score])
    }
    // trial answers also count for reports and egg warmth, like any other answer
    if (correct) await db.query(`UPDATE eggs e SET warmth = LEAST(e.warmth + 1, r.hatch_correct_needed) FROM rarities r
      WHERE e.rarity_id=r.id AND e.student_id=$1 AND e.nest_slot IS NOT NULL AND e.hatched_at IS NULL`, [studentId])
    return { correct, correctAnswer: right, explanation: row.explanation, timeLeft: left, combo, score, correctCount: nCorrect, done, next }
  })
}
