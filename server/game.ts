/**
 * Game rules shared by the routes: content cache, pets, XP, mood, eggs.
 * Numbers follow docs/team/design/game_rules.md and content/game_config.json.
 */
import type { PoolClient } from 'pg'
import { pool, q, one, kstDay, daysBetween, fail, type Db } from './db.js'
import type * as T from '../src/types.js'

/* ---------- content cache (read-only tables, loaded once per server instance) ---------- */
export interface StageRow {
  id: string; chapter_id: number; ord: number; is_boss: boolean; name_ko: string; anomaly_ko: string
  gauge: number; max_rounds: number; categories: T.Category[]; mission_types: T.MissionType[]
  difficulty: 'easy' | 'normal' | 'hard'; egg_slot: T.EggSlot | null
}
export interface SpeciesRow { id: string; rarity_id: T.Rarity; name_ko: string; type_id: T.Category; signature_skill_id: string; passive_code: string | null; passive_ko: string | null }
export interface SkillRow { id: string; name_ko: string; category_id: T.Category; kind: 'basic' | 'signature' }
interface Content {
  stages: StageRow[]
  species: SpeciesRow[]
  skills: SkillRow[]
  hatchNeed: Record<T.Rarity, number>
  rarityOrder: T.Rarity[]
  firstEggs: { chapter_id: number; slot: string; rarity_id: T.Rarity }[]
  drops: { chapter_id: number; slot: string; rarity_id: T.Rarity; percent: number }[]
  time: Record<string, number>
  chapters: { id: number; name_ko: string; status: 'playable' | 'planned' }[]
}
let cache: Promise<Content> | null = null
let cachedAt = 0
/** Admin edits call this so the next request reloads stages, rates and prices. */
export function resetContent(): void { cache = null }
export function content(): Promise<Content> {
  if (Date.now() - cachedAt > 60_000) cache = null   // other server instances pick up admin edits within a minute
  cache ??= (cachedAt = Date.now(), (async () => {
    const [stages, species, skills, rar, firstEggs, drops, mt, chapters] = await Promise.all([
      q<StageRow>(pool, 'SELECT * FROM story_stages ORDER BY chapter_id, ord'),
      q<SpeciesRow>(pool, 'SELECT * FROM pet_species'),
      q<SkillRow>(pool, 'SELECT * FROM skills'),
      q(pool, 'SELECT id, hatch_correct_needed FROM rarities ORDER BY ord'),
      q(pool, 'SELECT * FROM chapter_first_clear_eggs'),
      q(pool, 'SELECT * FROM egg_drop_rates'),
      q(pool, 'SELECT id, time_s FROM mission_types'),
      q(pool, 'SELECT id, name_ko, status FROM story_chapters ORDER BY ord'),
    ])
    return {
      stages, species, skills, firstEggs, drops, chapters,
      hatchNeed: Object.fromEntries(rar.map((r) => [r.id, r.hatch_correct_needed])) as Record<T.Rarity, number>,
      rarityOrder: rar.map((r) => r.id),
      time: Object.fromEntries(mt.map((r) => [r.id, r.time_s])),
    }
  })().catch((e) => { cache = null; throw e }))
  return cache
}
export const stageOf = (c: Content, id: string) => c.stages.find((s) => s.id === id) ?? fail(404, 'no stage ' + id)
export const speciesOf = (c: Content, id: string) => c.species.find((s) => s.id === id) ?? fail(500, 'unknown species ' + id)

/* ---------- students ---------- */
export interface StudentRow {
  id: number; username: string; nickname: string; role: 'STUDENT' | 'ADMIN'; cells: number; onboarded_at: string | null
  unlocks: string[]; battle_room_unlocked_at: string | null; mythic_pity: number; nest_slots: number
  three_star_day: string | null; free_hint_day: string | null
}
export async function student(db: Db, id: number, lock = false): Promise<StudentRow> {
  return (await one<StudentRow>(db, `SELECT * FROM students WHERE id=$1 ${lock ? 'FOR UPDATE' : ''}`, [id])) ?? fail(401, 'account not found')
}
export interface Limits { rewarded_battles: number; cells_earned: number; first_clear_bonus: boolean }
export async function limits(db: Db, studentId: number): Promise<Limits> {
  return (await one<Limits>(db, 'SELECT rewarded_battles, cells_earned, first_clear_bonus FROM student_daily_limits WHERE student_id=$1 AND day=$2', [studentId, kstDay()]))
    ?? { rewarded_battles: 0, cells_earned: 0, first_clear_bonus: false }
}

/* ---------- pets ---------- */
export interface PetRow { id: number; student_id: number; species_id: string; nickname: string; level: number; xp: number; is_partner: boolean; last_fed_on: string | null; born_on: string }

const BASIC: Record<T.Category, string> = { digital: 'pixel_shield', ai: 'pattern_scan', making: 'gear_hammer', computing: 'code_wave' }
export const formOf = (lv: number): T.PetForm => (lv >= 10 ? 'shining' : lv >= 7 ? 'adult' : lv >= 4 ? 'junior' : 'baby')
export const powerOf = (lv: number) => (lv >= 7 ? 30 : lv >= 3 ? 25 : 20)
export const xpNeed = (lv: number) => 50 * lv

export function moodOf(p: PetRow, s: StudentRow, c: Content, cleared: Set<string>, inBattle = false): T.Mood {
  if (inBattle) return 'tense'
  const d = kstDay()
  if (daysBetween(p.last_fed_on ?? p.born_on, d) >= 2) return 'sad'
  if (s.three_star_day === d) return 'harmony'
  if (p.last_fed_on === d) return 'calm'
  const open = c.stages.filter((st) => st.chapter_id === 1).some((st) => !cleared.has(st.id) && (st.ord === 1 || cleared.has(`c${st.chapter_id}s${st.ord - 1}`)))
  return open ? 'curious' : 'calm'
}
export function toPet(c: Content, p: PetRow, s: StudentRow, cleared: Set<string>, inBattle = false): T.Pet {
  const sp = speciesOf(c, p.species_id)
  const ids = (Object.keys(BASIC) as T.Category[]).map((cat) => (p.level >= 5 && sp.type_id === cat ? sp.signature_skill_id : BASIC[cat]))
  return {
    id: p.id, speciesId: p.species_id, nickname: p.nickname, rarity: sp.rarity_id, type: sp.type_id,
    level: p.level, xp: p.xp, xpToNext: p.level >= 10 ? 0 : xpNeed(p.level), form: formOf(p.level),
    isPartner: p.is_partner, mood: moodOf(p, s, c, cleared, inBattle), fedToday: p.last_fed_on === kstDay(),
    passiveKo: sp.passive_ko,
    skills: ids.map((id) => {
      const k = c.skills.find((x) => x.id === id)!
      return { id, nameKo: k.name_ko, category: k.category_id, power: Math.round(powerOf(p.level) * (k.category_id === sp.type_id ? 1.2 : 1)), signature: k.kind === 'signature' }
    }),
  }
}
export async function clearedSet(db: Db, studentId: number): Promise<Set<string>> {
  return new Set((await q(db, 'SELECT stage_id FROM stage_progress WHERE student_id=$1', [studentId])).map((r) => r.stage_id))
}
export async function petsOf(db: Db, studentId: number): Promise<PetRow[]> {
  return q<PetRow>(db, 'SELECT * FROM pets WHERE student_id=$1 ORDER BY is_partner DESC, id', [studentId])
}
/** Fully described pets for the API. */
export async function petList(db: Db, studentId: number): Promise<T.Pet[]> {
  const [c, s, rows, cleared] = await Promise.all([content(), student(db, studentId), petsOf(db, studentId), clearedSet(db, studentId)])
  return rows.map((p) => toPet(c, p, s, cleared))
}

/** Add XP with level-ups (Lv n -> n+1 costs 50 x n, max Lv 10). Writes the pet row. */
export async function addXp(db: PoolClient, c: Content, p: PetRow, n: number): Promise<T.FinishRes['levelUp']> {
  const from = p.level, f0 = formOf(p.level)
  if (p.level < 10) {
    p.xp += n
    while (p.level < 10 && p.xp >= xpNeed(p.level)) { p.xp -= xpNeed(p.level); p.level++ }
    if (p.level >= 10) p.xp = 0
  }
  await db.query('UPDATE pets SET level=$2, xp=$3 WHERE id=$1', [p.id, p.level, p.xp])
  if (p.level === from) return null
  return { from, to: p.level, newForm: formOf(p.level) !== f0 ? formOf(p.level) : null, newSkillId: from < 5 && p.level >= 5 ? speciesOf(c, p.species_id).signature_skill_id : null }
}

/* ---------- eggs ---------- */
export interface EggRow { id: number; rarity_id: T.Rarity; source: T.EggSource; warmth: number; nest_slot: number | null }
export function toEgg(c: Content, e: EggRow): T.Egg {
  const need = c.hatchNeed[e.rarity_id]
  return { id: e.id, rarity: e.rarity_id, source: e.source, warmth: Math.min(e.warmth, need), warmthNeeded: need, nestSlot: e.nest_slot, ready: e.warmth >= need }
}
/** Put the egg in the first free nest slot (if the nest is unlocked). */
export async function placeEgg(db: PoolClient, s: StudentRow, eggId: number): Promise<number | null> {
  if (!s.unlocks.includes('nest')) return null
  const used = new Set((await q(db, 'SELECT nest_slot FROM eggs WHERE student_id=$1 AND hatched_at IS NULL AND nest_slot IS NOT NULL', [s.id])).map((r) => r.nest_slot))
  for (let i = 0; i < s.nest_slots; i++) if (!used.has(i)) {
    await db.query('UPDATE eggs SET nest_slot=$2 WHERE id=$1', [eggId, i])
    return i
  }
  return null
}
export async function giveEgg(db: PoolClient, s: StudentRow, rarity: T.Rarity, source: T.EggSource, ref: string | null): Promise<{ id: number; inNest: boolean }> {
  const e = (await one(db, 'INSERT INTO eggs (student_id, rarity_id, source, source_ref) VALUES ($1,$2,$3,$4) RETURNING id', [s.id, rarity, source, ref]))!
  const slot = await placeEgg(db, s, e.id)
  return { id: e.id, inNest: slot !== null }
}

/* ---------- cells ---------- */
/** Every cell change: update the cached balance AND write a ledger row, in the caller's transaction. */
export async function changeCells(db: PoolClient, studentId: number, delta: number, reason: string, ref: string | null): Promise<number> {
  const r = await one(db, 'UPDATE students SET cells = cells + $2 WHERE id=$1 RETURNING cells', [studentId, delta])
  if (!r) fail(404, 'no student')
  await db.query('INSERT INTO cell_ledger (student_id, delta, reason, ref, balance) VALUES ($1,$2,$3,$4,$5)', [studentId, delta, reason, ref, r.cells])
  return r.cells
}

export const pick = <X>(a: X[]): X => a[Math.floor(Math.random() * a.length)]
export function shuffle<X>(a: X[]): X[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}
