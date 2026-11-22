/**
 * GET /api/selftest — plays Stage 1 end to end against the real database as a throwaway student,
 * then deletes that student (ON DELETE CASCADE removes all of its rows). Used to verify a deploy.
 */
import { pool, one, kstDay } from './db.js'
import * as battle from './battle.js'
import * as quests from './quests.js'
import * as trial from './trial.js'
import type * as T from '../src/types.js'

async function right(battleId: string): Promise<T.Answer> {
  const b = (await one(pool, 'SELECT current FROM battles WHERE id=$1', [battleId]))!
  const q = (await one(pool, 'SELECT * FROM questions WHERE id=$1', [b.current.q]))!
  const o: number[] = b.current.order
  switch (q.mission_type_id) {
    case 'choice4': return o.indexOf(Number(q.answer))
    case 'puzzle': return q.answer
    case 'ox': return q.answer
    case 'keyword': return q.answer[0]
    case 'order': case 'command_order': return [...o.keys()].sort((x, y) => o[x] - o[y])
    case 'pixel_art': return (q.payload.target as string[]).join('').split('').map(Number)
  }
  return null
}

export async function selftest(): Promise<unknown> {
  const t0 = Date.now()
  const s = (await one(pool, `INSERT INTO students (username, nickname, password_hash) VALUES ($1,'selftest','x') RETURNING id`, ['selftest_' + Date.now().toString(36)]))!
  const steps: string[] = []
  try {
    const pet = (await one(pool, `INSERT INTO pets (student_id, species_id, nickname, is_partner, born_on) VALUES ($1,'dog','테스트',true,$2) RETURNING id`, [s.id, kstDay()]))!
    await pool.query('UPDATE students SET onboarded_at=now() WHERE id=$1', [s.id])
    const st = await battle.startBattle(s.id, { stageId: 'c1s1', petId: pet.id, mode: 'STORY' })
    let state = st.state, calls = 1
    while (state.phase !== 'WON' && state.phase !== 'LOST') {
      const sk = await battle.useSkill(s.id, state.battleId, state.pet.skills[0].id)
      let a = await battle.answer(s.id, state.battleId, sk.question.id, await right(state.battleId))
      calls += 2
      if (a.nextQuestion) { a = await battle.answer(s.id, state.battleId, a.nextQuestion.id, await right(state.battleId)); calls++ }
      state = a.state
      steps.push(`round ${state.round}: gauge ${state.gauge} energy ${state.energy}`)
    }
    const fin = await battle.finish(s.id, state.battleId)
    const ql = await quests.list(s.id)
    const lob = await trial.lobby(s.id)
    return { ok: fin.won && fin.stars === 3 && ql.quests.length === 3 && lob.unlocked === false, quests: ql.quests.map((x) => `${x.id} ${x.progress}/${x.target}`), won: fin.won, stars: fin.stars, xp: fin.xpGained, cellsMailed: fin.cellsMailed, unlocks: fin.unlocksKo, steps, apiCalls: calls + 1, ms: Date.now() - t0, msPerCall: Math.round((Date.now() - t0) / (calls + 1)) }
  } finally {
    await pool.query('DELETE FROM students WHERE id=$1', [s.id])
  }
}

/** Plays one stage with correct answers for a real account (used by the demo account setup). */
export async function playStage(studentId: number, stageId: string): Promise<string> {
  const partner = (await one(pool, 'SELECT id FROM pets WHERE student_id=$1 AND is_partner', [studentId]))!
  const st = await battle.startBattle(studentId, { stageId, petId: partner.id, mode: 'STORY' })
  let state = st.state
  while (state.phase !== 'WON' && state.phase !== 'LOST') {
    const sk = await battle.useSkill(studentId, state.battleId, state.pet.skills[Math.floor(Math.random() * 4)].id)
    let a = await battle.answer(studentId, state.battleId, sk.question.id, await right(state.battleId))
    if (a.nextQuestion) a = await battle.answer(studentId, state.battleId, a.nextQuestion.id, await right(state.battleId))
    state = a.state
  }
  const f = await battle.finish(studentId, state.battleId)
  return `${stageId} ${f.won ? 'won' : 'lost'} ${'★'.repeat(f.stars)} lv${f.pet.level}${f.egg ? ' egg:' + f.egg.rarity : ''}`
}
