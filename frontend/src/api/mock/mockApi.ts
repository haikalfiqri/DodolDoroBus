/**
 * MOCK SERVER. Pretends to be Akip's backend so screens can be built now.
 * It follows docs/design/game_rules.md (same rules as the HTML prototype).
 * Delete nothing here when the real API is ready: just set VITE_USE_MOCK=false.
 *
 * Covered: me, onboarding, chapters, stages, the whole battle loop, pets, feed,
 * eggs + nest + hatch, dex, mail, shop. Not mocked yet: quests, battle room, report, admin.
 */
import type * as T from '../types'
import stagesJson from '@content/stages.json'
import chaptersJson from '@content/chapters.json'
import petsJson from '@content/pets.json'
import skillsJson from '@content/skills.json'
import eggsJson from '@content/eggs.json'
import shopJson from '@content/shop_items.json'
import dialogueJson from '@content/dialogue/ch1.json'
import dropCsv from '@content/egg_drop_rates.csv?raw'
import questionsJson from './questions.json'

/* ---------- content (what the backend seeds into its tables) ---------- */
type StageRow = (typeof stagesJson.stages)[number]
type SpeciesRow = (typeof petsJson.pets)[number]
interface QRow {
  id: string
  cat: T.Category
  diff: string
  type: T.MissionType
  prompt: string
  payload: null | { choices?: string[]; items?: string[]; target?: string[]; seq?: (string | number)[] }
  answer: unknown
  ex: string
}

const STAGES: StageRow[] = stagesJson.stages
const SPECIES: SpeciesRow[] = petsJson.pets
const QUESTIONS = questionsJson as QRow[]
const RARITIES: T.Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'mythic']
const HATCH_NEED = Object.fromEntries(eggsJson.eggs.map((e) => [e.rarity, e.hatch_correct_needed])) as Record<T.Rarity, number>
const DROPS = dropCsv
  .trim()
  .split('\n')
  .slice(1)
  .map((l) => {
    const [ch, slot, rarity, p] = l.split(',')
    return { ch: Number(ch), slot, rarity: rarity as T.Rarity, percent: Number(p) }
  })
const TIME: Record<T.MissionType, number> = { choice4: 20, ox: 20, order: 30, keyword: 30, command_order: 30, pixel_art: 45, puzzle: 30 }
const PASSIVE_KO: Record<string, string> = {
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
  revive_30: '불사의 불꽃: 배틀마다 1번, 쓰러지면 에너지 30으로 부활',
  combo_double: '구름의 흐름: 콤보가 2배로 빨리 올라요',
}
const BASIC: Record<T.Category, string> = { digital: 'pixel_shield', ai: 'pattern_scan', making: 'gear_hammer', computing: 'code_wave' }
const UNLOCKS: Record<string, string[]> = {
  c1s1: ['🏠 마이룸이 열렸어요', '🛍 자일로 상점이 열렸어요'],
  c1s2: ['📜 오늘의 퀘스트가 열렸어요', '🔎 리코의 분석 (힌트)'],
  c1s3: ['🪺 둥지가 열렸어요'],
  c1s7: ['⚔ 배틀룸이 열렸어요', '🪺 둥지 2칸'],
}

/* ---------- player state (what the backend keeps in PostgreSQL) ---------- */
interface PetRow { id: number; species: string; nickname: string; level: number; xp: number; partner: boolean; lastFed: number | null; born: number }
interface EggRow { id: number; rarity: T.Rarity; source: T.EggSource; warmth: number; nestSlot: number | null }
interface MailRow { id: string; title: string; amount: number; createdAt: string; claimed: boolean }
interface ServerQ { q: QRow; order: number[] } // order: shown position -> original index
interface BattleRow {
  id: string; stage: StageRow; mode: T.BattleMode; petId: number
  phase: T.BattlePhase; round: number; energy: number; maxEnergy: number; gauge: number
  comboBase: number; combo: number; skill: string | null; current: ServerQ | null
  used: string[]; correct: number; total: number; hintUsed: boolean
  firstSkill: boolean; missHalf: boolean; dodgeSave: boolean; revive: boolean; finished: boolean
}
interface DB {
  nickname: string; onboarded: boolean; cells: number; nextId: number
  pets: PetRow[]; eggs: EggRow[]; mail: MailRow[]; items: Record<string, number>
  progress: Record<string, { best: T.Stars; clears: number; first: number }>
  pity: number; nestSlots: number; flags: Record<string, boolean>
  day: number; rewardedBattles: number; cellsEarned: number; firstClearToday: boolean
  threeStarDay: number | null; freeHintDay: number | null; recent: string[]
  battles: Record<string, BattleRow>
}

const KEY = 'codex-trial-mock-db'
const today = () => Math.floor((Date.now() + 9 * 3600e3) / 864e5) // KST day number
function fresh(): DB {
  return {
    nickname: '별빛코더', onboarded: false, cells: 0, nextId: 1, pets: [], eggs: [],
    mail: [{ id: 'm0', title: '[DOROBUS] 출석 보상', amount: 10, createdAt: new Date().toISOString(), claimed: false }],
    items: {}, progress: {}, pity: 0, nestSlots: 1, flags: {}, day: today(), rewardedBattles: 0,
    cellsEarned: 0, firstClearToday: true, threeStarDay: null, freeHintDay: null, recent: [], battles: {},
  }
}
let db: DB = load()
function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as DB) }
  } catch { /* storage blocked: start fresh */ }
  return fresh()
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ }
}
function rollDay() {
  if (db.day !== today()) { db.day = today(); db.rewardedBattles = 0; db.cellsEarned = 0; db.firstClearToday = true }
}
/** Dev helper: wipe the mock database (call resetMock() from the browser console). */
export function resetMock() { db = fresh(); save() }
;(globalThis as Record<string, unknown>).resetMock = resetMock

/* ---------- helpers ---------- */
const delay = <R>(v: R): Promise<R> => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120)) // fake network
function fail(status: number, msg: string): never { throw Object.assign(new Error(msg), { status }) }
const pick = <X>(a: X[]): X => a[Math.floor(Math.random() * a.length)]
function shuffle<X>(a: X[]): X[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const species = (id: string) => SPECIES.find((s) => s.id === id) ?? fail(500, 'unknown species ' + id)
const stageById = (id: string) => STAGES.find((s) => s.id === id) ?? fail(404, 'no stage ' + id)
const formOf = (lv: number): T.PetForm => (lv >= 10 ? 'shining' : lv >= 7 ? 'adult' : lv >= 4 ? 'junior' : 'baby')
const powerOf = (lv: number) => [...skillsJson.power_by_level].reverse().find((p) => lv >= p.from_level)!.power
const xpNeed = (lv: number) => 50 * lv
const partnerRow = () => db.pets.find((p) => p.partner) ?? db.pets[0]
const owns = (sp: string) => db.pets.some((p) => p.species === sp)

function unlocked(st: StageRow): boolean {
  if (st.order === 1) return true
  const prev = STAGES.find((s) => s.chapter === st.chapter && s.order === st.order - 1)
  return !!prev && !!db.progress[prev.id]
}
function moodOf(p: PetRow, inBattle = false): T.Mood {
  if (inBattle) return 'tense'
  const d = today()
  if (d - (p.lastFed ?? p.born) >= 2) return 'sad'
  if (db.threeStarDay === d) return 'harmony'
  if (p.lastFed === d) return 'calm'
  if (STAGES.some((s) => unlocked(s) && !db.progress[s.id])) return 'curious'
  return 'calm'
}
function toPet(p: PetRow, inBattle = false): T.Pet {
  const sp = species(p.species)
  const ids = (Object.keys(BASIC) as T.Category[]).map((c) => (p.level >= 5 && sp.type === c ? sp.signature_skill : BASIC[c]))
  return {
    id: p.id, speciesId: p.species, nickname: p.nickname, rarity: sp.rarity as T.Rarity, type: sp.type as T.Category,
    level: p.level, xp: p.xp, xpToNext: p.level >= 10 ? 0 : xpNeed(p.level), form: formOf(p.level),
    isPartner: p.partner, mood: moodOf(p, inBattle), fedToday: p.lastFed === today(),
    passiveKo: sp.passive_code ? PASSIVE_KO[sp.passive_code] ?? null : null,
    skills: ids.map((id) => {
      const s = skillsJson.skills.find((x) => x.id === id)!
      return { id, nameKo: s.name_ko, category: s.category as T.Category, power: Math.round(powerOf(p.level) * (s.category === sp.type ? 1.2 : 1)), signature: s.kind === 'signature' }
    }),
  }
}
function addXp(p: PetRow, n: number): FinishLevel {
  const from = p.level, f0 = formOf(p.level)
  if (p.level < 10) {
    p.xp += n
    while (p.level < 10 && p.xp >= xpNeed(p.level)) { p.xp -= xpNeed(p.level); p.level++ }
    if (p.level >= 10) p.xp = 0
  }
  if (p.level === from) return null
  return { from, to: p.level, newForm: formOf(p.level) !== f0 ? formOf(p.level) : null, newSkillId: from < 5 && p.level >= 5 ? species(p.species).signature_skill : null }
}
type FinishLevel = T.FinishRes['levelUp']
function sendCells(amount: number, title: string): number {
  const amt = Math.min(amount, Math.max(0, 60 - db.cellsEarned))
  if (amt <= 0) return 0
  db.cellsEarned += amt
  db.mail.unshift({ id: 'm' + db.nextId++, title, amount: amt, createdAt: new Date().toISOString(), claimed: false })
  return amt
}
function placeEgg(e: EggRow): void {
  if (!db.flags.nest || e.nestSlot !== null) return
  for (let i = 0; i < db.nestSlots; i++) if (!db.eggs.some((x) => x.nestSlot === i)) { e.nestSlot = i; return }
}
function giveEgg(rarity: T.Rarity, source: T.EggSource): EggRow {
  const e: EggRow = { id: db.nextId++, rarity, source, warmth: 0, nestSlot: null }
  db.eggs.push(e)
  placeEgg(e)
  return e
}
function toEgg(e: EggRow): T.Egg {
  return { id: e.id, rarity: e.rarity, source: e.source, warmth: e.warmth, warmthNeeded: HATCH_NEED[e.rarity], nestSlot: e.nestSlot, ready: e.warmth >= HATCH_NEED[e.rarity] }
}

/* ---------- questions: the server shuffles and keeps the key ---------- */
function chooseQuestion(b: BattleRow, cat: T.Category | null, types: T.MissionType[]): ServerQ {
  const ok = (q: QRow) => (!cat || q.cat === cat) && types.includes(q.type) && !b.used.includes(q.id)
  const special: T.MissionType[] = types.filter((t) => t !== 'choice4' && t !== 'ox')
  let pool = special.length && Math.random() < 0.55 ? QUESTIONS.filter((q) => ok(q) && special.includes(q.type)) : []
  if (!pool.length) pool = QUESTIONS.filter(ok)
  if (!pool.length) pool = QUESTIONS.filter((q) => (!cat || q.cat === cat) && (q.type === 'choice4' || q.type === 'ox'))
  const fresh = pool.filter((q) => !db.recent.includes(q.id))
  const q = pick(fresh.length ? fresh : pool)
  db.recent = [...db.recent, q.id].slice(-50)
  b.used.push(q.id)
  const n = q.payload?.choices?.length ?? q.payload?.items?.length ?? 0
  const order = q.type === 'puzzle' ? [0, 1, 2, 3] : shuffle([...Array(n).keys()])
  return { q, order }
}
function toQuestion(sq: ServerQ, b: BattleRow): T.Question {
  const { q, order } = sq, P = q.payload ?? {}
  const pc = species(db.pets.find((p) => p.id === b.petId)!.species).passive_code
  let t = TIME[q.type]
  if (pc === 'order_time_plus_5' && (q.type === 'order' || q.type === 'command_order')) t += 5
  if (pc === 'all_time_plus_5') t += 5
  let payload: T.QuestionPayload
  switch (q.type) {
    case 'choice4': payload = { kind: 'choice4', choices: order.map((i) => P.choices![i]) }; break
    case 'ox': payload = { kind: 'ox' }; break
    case 'order': payload = { kind: 'order', items: order.map((i) => P.items![i]) }; break
    case 'command_order': payload = { kind: 'command_order', items: order.map((i) => P.items![i]) }; break
    case 'keyword': payload = { kind: 'keyword' }; break
    case 'pixel_art': payload = { kind: 'pixel_art', size: P.target!.length, target: P.target! }; break
    case 'puzzle': payload = { kind: 'puzzle', seq: P.seq!, choices: (P as { choices: (string | number)[] }).choices }; break
  }
  return { id: q.id, category: q.cat, missionType: q.type, prompt: q.prompt, payload, timeLimitS: t, hintAvailable: db.flags.hint === true && !b.hintUsed && (q.type === 'choice4' || q.type === 'puzzle') }
}
/** returns [correct?, correct answer in shown positions] */
function check(sq: ServerQ, a: T.Answer): [boolean, T.Answer] {
  const { q, order } = sq
  switch (q.type) {
    case 'choice4': { const right = order.indexOf(q.answer as number); return [a === right, right] }
    case 'puzzle': return [a === q.answer, q.answer as number]
    case 'ox': return [a === q.answer, q.answer as 'O' | 'X']
    case 'keyword': { const n = (s: unknown) => String(s).toLowerCase().replace(/\s+/g, ''); const list = q.answer as string[]; return [a !== null && list.some((x) => n(x) === n(a)), list[0]] }
    case 'order': case 'command_order': {
      const right = [...order.keys()].sort((x, y) => order[x] - order[y]) // shown positions in correct order
      return [Array.isArray(a) && a.length === right.length && a.every((v, i) => v === right[i]), right]
    }
    case 'pixel_art': { const right = q.payload!.target!.join('').split('').map(Number); return [Array.isArray(a) && a.join('') === right.join(''), right] }
  }
}

function state(b: BattleRow): T.BattleState {
  const p = db.pets.find((x) => x.id === b.petId)!
  return { battleId: b.id, stageId: b.stage.id, mode: b.mode, phase: b.phase, round: b.round, maxRounds: b.stage.max_rounds, energy: Math.max(0, b.energy), maxEnergy: b.maxEnergy, gauge: Math.max(0, b.gauge), maxGauge: b.stage.gauge, combo: b.combo, pet: toPet(p, true), ghost: null }
}
const battle = (id: string) => db.battles[id] ?? fail(404, 'no battle ' + id)

/* ---------- the API ---------- */
export const mockApi: T.Api = {
  async me() {
    rollDay()
    const p = partnerRow()
    return delay<T.Me>({
      nickname: db.nickname, cells: db.cells, unclaimedMail: db.mail.filter((m) => !m.claimed).length, onboarded: db.onboarded,
      partner: p ? toPet(p) : null, battleRoomUnlocked: !!db.flags.battleRoom, mythicPity: db.pity, nestSlots: db.nestSlots,
      unlocked: { myRoom: !!db.flags.room, shop: !!db.flags.room, quests: !!db.flags.quests, hint: !!db.flags.hint, nest: !!db.flags.nest },
      today: { rewardedBattles: db.rewardedBattles, cellsEarned: db.cellsEarned, firstClearBonusAvailable: db.firstClearToday },
    })
  },

  async onboarding(petName) {
    if (db.onboarded) fail(409, 'already onboarded')
    const sp = pick(['dog', 'cat', 'rabbit'])
    const name = petName.trim().slice(0, 8) || species(sp).name_ko
    db.pets.push({ id: db.nextId++, species: sp, nickname: name, level: 1, xp: 0, partner: true, lastFed: null, born: today() })
    db.onboarded = true
    db.mail.unshift({ id: 'm' + db.nextId++, title: '[코덱스] 도로랜드 입단 환영 선물', amount: 20, createdAt: new Date().toISOString(), claimed: false })
    save()
    return { me: await mockApi.me(), pet: toPet(partnerRow()) }
  },

  async chapters() {
    return delay(chaptersJson.chapters.map((c) => {
      const st = STAGES.filter((s) => s.chapter === c.id)
      return { id: c.id, nameKo: c.name_ko, status: c.status as 'playable' | 'planned', locked: c.status !== 'playable', cleared: st.filter((s) => db.progress[s.id]).length, total: st.length || 7 }
    }))
  },

  async stages(chapterId) {
    const ch = chaptersJson.chapters.find((c) => c.id === chapterId) ?? fail(404, 'no chapter')
    return delay(STAGES.filter((s) => s.chapter === chapterId).map((s): T.StageSummary => {
      const slot = s.egg_slot as T.EggSlot | null
      const pr = db.progress[s.id]
      return {
        id: s.id, chapterId: s.chapter, order: s.order, isBoss: s.is_boss, nameKo: s.name_ko, anomalyKo: s.anomaly_ko,
        gauge: s.gauge, maxRounds: s.max_rounds, categories: s.categories as T.Category[], missionTypes: s.mission_types as T.MissionType[],
        difficulty: s.difficulty as T.StageSummary['difficulty'], locked: !unlocked(s), bestStars: pr?.best ?? 0, firstCleared: !!pr,
        eggSlot: slot, firstClearEgg: slot ? (ch.first_clear_eggs[slot] as T.Rarity) : null,
        dropRates: slot ? DROPS.filter((d) => d.ch === chapterId && d.slot === slot).map(({ rarity, percent }) => ({ rarity, percent })) : null,
      }
    }))
  },

  async startBattle(req) {
    const st = stageById(req.stageId)
    if (!unlocked(st)) fail(403, 'stage locked')
    if (req.mode !== 'STORY') fail(501, 'GHOST/TRIAL not mocked yet')
    const pet = db.pets.find((p) => p.id === req.petId) ?? fail(404, 'no pet')
    db.pets.forEach((p) => (p.partner = p.id === pet.id)) // the chosen pet becomes partner
    const pc = species(pet.species).passive_code
    const maxE = pc === 'start_energy_110' ? 110 : 100
    const base = pc === 'combo_start_1_2' ? 1.2 : 1
    const b: BattleRow = {
      id: 'b' + db.nextId++, stage: st, mode: 'STORY', petId: pet.id, phase: 'PICK_SKILL', round: 1, energy: maxE, maxEnergy: maxE,
      gauge: st.gauge, comboBase: base, combo: base, skill: null, current: null, used: [], correct: 0, total: 0, hintUsed: false,
      firstSkill: true, missHalf: pc === 'first_miss_half', dodgeSave: pc === 'dodge_save_once', revive: pc === 'revive_30', finished: false,
    }
    db.battles = { [b.id]: b } // keep only the active battle
    save()
    const intro = db.progress[st.id] ? [] : (dialogueJson.stages as Record<string, { intro: T.DialogueLine[] }>)[st.id].intro
    return delay({ state: state(b), intro })
  },

  async useSkill(id, skillId) {
    const b = battle(id)
    if (b.phase !== 'PICK_SKILL') fail(409, 'not your turn')
    const pet = toPet(db.pets.find((p) => p.id === b.petId)!)
    const sk = pet.skills.find((s) => s.id === skillId) ?? fail(400, 'skill not equipped')
    b.skill = skillId
    b.current = chooseQuestion(b, sk.category, b.stage.mission_types as T.MissionType[])
    b.phase = 'PET_QUESTION'
    save()
    return delay({ state: state(b), question: toQuestion(b.current, b) })
  },

  async answer(id, questionId, ans) {
    const b = battle(id)
    if (!b.current || b.current.q.id !== questionId) fail(409, 'wrong question')
    const [correct, correctAnswer] = check(b.current, ans)
    const q = b.current.q
    const pet = db.pets.find((p) => p.id === b.petId)!
    const pc = species(pet.species).passive_code
    b.total++
    if (correct) {
      b.correct++
      db.eggs.forEach((e) => { if (e.nestSlot !== null && e.warmth < HATCH_NEED[e.rarity]) e.warmth++ }) // warm nest eggs
    }
    let effect: T.AnswerEffect
    let nextQuestion: T.Question | null = null
    if (b.phase === 'PET_QUESTION') {
      const sk = toPet(pet).skills.find((s) => s.id === b.skill)!
      if (correct) {
        const lion = b.firstSkill && pc === 'first_skill_plus_30'
        const dmg = Math.round(sk.power * b.combo * (lion ? 1.3 : 1))
        b.gauge -= dmg
        effect = { kind: 'DAMAGE', amount: dmg, noteKo: `${sk.nameKo}! 게이지 -${dmg}${lion ? ' (왕의 포효 +30%)' : ''}` }
      } else effect = { kind: 'MISS', amount: 0, noteKo: '빗나갔어요. 게이지 그대로' }
      b.combo = b.comboBase
      b.firstSkill = false
      if (b.gauge <= 0) b.phase = 'WON'
      else {
        const dodgeTypes = (b.stage.mission_types as T.MissionType[]).filter((t) => t === 'ox' || t === 'choice4')
        b.current = chooseQuestion(b, pick(b.stage.categories as T.Category[]), dodgeTypes.length ? dodgeTypes : ['ox', 'choice4'])
        b.phase = 'ANOMALY_QUESTION'
        nextQuestion = toQuestion(b.current, b)
      }
    } else {
      if (correct || b.dodgeSave) {
        let note = ''
        if (!correct) { b.dodgeSave = false; note = '⚖ 해치의 정의의 판정! ' }
        const step = (pc === 'dodge_combo_0_3' ? 0.3 : 0.2) * (pc === 'combo_double' ? 2 : 1)
        b.combo = Math.min(2, Math.round((b.combo + step) * 10) / 10)
        effect = { kind: 'DODGE', amount: b.combo, noteKo: `${note}회피 성공! 콤보 ×${b.combo.toFixed(1)}` }
      } else {
        let dmg = b.stage.is_boss ? 20 : 15, note = ''
        if (b.missHalf) { dmg = Math.round(dmg / 2); b.missHalf = false; note = '🐼 느긋함: 절반만! ' }
        b.energy -= dmg
        if (b.energy <= 0 && b.revive) { b.revive = false; b.energy = 30; note += '🔥 봉황 부활! ' }
        effect = { kind: 'HIT', amount: dmg, noteKo: `${note}에너지 -${dmg}` }
      }
      if (b.energy <= 0) b.phase = 'LOST'
      else if (b.round >= b.stage.max_rounds) b.phase = 'LOST'
      else { b.round++; b.phase = 'PICK_SKILL' }
      b.current = null
    }
    save()
    return delay({ correct, correctAnswer, explanation: q.ex, effect, state: state(b), nextQuestion })
  },

  async hint(id) {
    const b = battle(id)
    if (!db.flags.hint || b.hintUsed || !b.current) fail(409, 'no hint')
    const { q, order } = b.current
    if (q.type !== 'choice4' && q.type !== 'puzzle') fail(400, 'hint only for choice questions')
    const pet = db.pets.find((p) => p.id === b.petId)!
    const free = species(pet.species).passive_code === 'free_hint_daily' && db.freeHintDay !== today()
    if (free) db.freeHintDay = today()
    else if (db.cells < 3) fail(402, 'not enough cells')
    else db.cells -= 3
    b.hintUsed = true
    const rightShown = q.type === 'choice4' ? order.indexOf(q.answer as number) : (q.answer as number)
    const wrong = [0, 1, 2, 3].filter((i) => i !== rightShown)
    save()
    return delay({ removeChoiceIndex: pick(wrong), cells: db.cells })
  },

  async finish(id) {
    const b = battle(id)
    if (b.phase !== 'WON' && b.phase !== 'LOST') fail(409, 'battle not over')
    if (b.finished) fail(409, 'already finished')
    b.finished = true
    rollDay()
    const st = b.stage, won = b.phase === 'WON', d = today()
    const pet = db.pets.find((p) => p.id === b.petId)!
    const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0
    const energy = Math.max(0, b.energy)
    const stars: T.Stars = !won ? 0 : energy >= 80 ? 3 : energy >= 50 ? 2 : 1
    const rewarded = won && db.rewardedBattles < 10 && db.cellsEarned < 60
    const res: T.FinishRes = {
      won, stars, xpGained: 0, levelUp: null, pet: toPet(pet), cellsMailed: 0, firstClearOfDayBonus: false, practiceMode: won && !rewarded,
      egg: null, eggNoteKo: '', unlocksKo: [], record: { score: won ? energy * 10 + acc * 5 : 0, accuracy: acc, energyLeft: energy, isBest: false },
      ghost: null, dialogue: [],
    }
    const lines = (dialogueJson.stages as Record<string, { win: T.DialogueLine[]; lose: T.DialogueLine[] }>)[st.id]
    if (won) {
      const first = !db.progress[st.id]
      const pr = (db.progress[st.id] ??= { best: 0, clears: 0, first: d })
      pr.best = Math.max(pr.best, stars) as T.Stars
      pr.clears++
      res.record.isBest = true // (mock: no separate record table)
      if (first) {
        res.unlocksKo = UNLOCKS[st.id] ?? []
        if (st.id === 'c1s1') db.flags.room = true
        if (st.id === 'c1s2') { db.flags.quests = true; db.flags.hint = true }
        if (st.id === 'c1s3') db.flags.nest = true
        if (st.id === 'c1s7') { db.flags.battleRoom = true; db.nestSlots = 2 }
        db.eggs.forEach(placeEgg)
        res.dialogue = lines.win
      }
      if (rewarded) {
        db.rewardedBattles++
        const base = st.is_boss ? 20 : [5, 10, 15][stars - 1]
        res.firstClearOfDayBonus = db.firstClearToday
        db.firstClearToday = false
        res.cellsMailed = sendCells(base + (res.firstClearOfDayBonus ? 5 : 0), `[코덱스의 시험] ${st.name_ko} ${'★'.repeat(stars)}`)
      }
      const slot = st.egg_slot as T.EggSlot | null
      if (slot) {
        const ch = chaptersJson.chapters.find((c) => c.id === st.chapter)!
        if (first) {
          const e = giveEgg(ch.first_clear_eggs[slot] as T.Rarity, 'STORY')
          res.egg = { id: e.id, rarity: e.rarity, source: e.source, inNest: e.nestSlot !== null }
          res.eggNoteKo = '첫 클리어 보상 (확정)'
        } else if (rewarded && stars >= 2) {
          const rows = DROPS.filter((x) => x.ch === st.chapter && x.slot === slot)
          const r = Math.random() * 100
          let acc2 = 0, got: T.Rarity | null = null
          for (const rar of [...RARITIES].reverse()) { const row = rows.find((x) => x.rarity === rar); if (!row) continue; acc2 += row.percent; if (r < acc2) { got = rar; break } }
          let source: T.EggSource = 'REPLAY'
          if (st.is_boss) { if (got === 'mythic') db.pity = 0; else if (++db.pity >= 50) { got = 'mythic'; source = 'PITY'; db.pity = 0 } }
          if (got) { const e = giveEgg(got, source); res.egg = { id: e.id, rarity: e.rarity, source, inNest: e.nestSlot !== null }; res.eggNoteKo = source === 'PITY' ? '코덱스의 호의: 신화 확정!' : '다시 깨기 드롭' }
          else res.eggNoteKo = `이번엔 알이 안 나왔어요 (알이 나올 확률 ${rows.reduce((a, x) => a + x.percent, 0)}%)`
        } else res.eggNoteKo = rewarded ? '★★ 이상이면 알 드롭 기회가 있어요' : '연습 모드에서는 알 드롭이 없어요'
      }
      if (stars === 3) db.threeStarDay = d
    } else res.dialogue = lines.lose
    let xp = won ? (st.is_boss ? 100 : 30 + 10 * stars) : 10
    if (pet.lastFed === d) xp = Math.round(xp * (species(pet.species).passive_code === 'food_xp_15' ? 1.15 : 1.1))
    res.xpGained = xp
    res.levelUp = addXp(pet, xp)
    res.pet = toPet(pet)
    save()
    return delay(res)
  },

  async pets() { return delay(db.pets.map((p) => toPet(p))) },
  async setPartner(petId) {
    if (!db.pets.some((p) => p.id === petId)) fail(404, 'no pet')
    db.pets.forEach((p) => (p.partner = p.id === petId)); save()
    return mockApi.pets()
  },
  async renamePet(petId, nickname) {
    const p = db.pets.find((x) => x.id === petId) ?? fail(404, 'no pet')
    p.nickname = nickname.trim().slice(0, 8) || p.nickname; save()
    return delay(toPet(p))
  },
  async feed(petId) {
    const p = db.pets.find((x) => x.id === petId) ?? fail(404, 'no pet')
    if (!db.flags.room) fail(403, 'feeding opens after stage 1')
    if (p.lastFed === today()) fail(409, 'already fed today')
    if ((db.items.pet_food ?? 0) > 0) db.items.pet_food--
    else if (db.cells < 5) fail(402, 'not enough cells')
    else db.cells -= 5
    p.lastFed = today(); save()
    return delay({ pet: toPet(p), cells: db.cells })
  },

  async eggs() { return delay(db.eggs.map(toEgg)) },
  async moveEggToNest(eggId) {
    const e = db.eggs.find((x) => x.id === eggId) ?? fail(404, 'no egg')
    placeEgg(e)
    if (e.nestSlot === null) fail(409, 'nest is full or locked')
    save(); return mockApi.eggs()
  },
  async hatch(eggId) {
    const e = db.eggs.find((x) => x.id === eggId) ?? fail(404, 'no egg')
    if (e.warmth < HATCH_NEED[e.rarity]) fail(409, 'egg not ready')
    db.eggs = db.eggs.filter((x) => x !== e)
    const candidates = SPECIES.filter((s) => s.rarity === e.rarity && !owns(s.id)) // bag rule: no duplicates until the set is complete
    let res: T.HatchRes
    if (!candidates.length) { const p = partnerRow(); addXp(p, 100); res = { result: 'SNACK', pet: null, snackXpTo: toPet(p) } }
    else {
      const sp = pick(candidates)
      const p: PetRow = { id: db.nextId++, species: sp.id, nickname: sp.name_ko, level: 1, xp: 0, partner: false, lastFed: null, born: today() }
      db.pets.push(p)
      res = { result: 'PET', pet: toPet(p), snackXpTo: null }
    }
    save(); return delay(res)
  },
  async dex() { return delay(SPECIES.map((s) => ({ speciesId: s.id, rarity: s.rarity as T.Rarity, owned: owns(s.id) }))) },

  async mail() { rollDay(); return delay(db.mail.map((m) => ({ ...m }))) },
  async claimMail(mailId) {
    const m = db.mail.find((x) => x.id === mailId) ?? fail(404, 'no mail')
    if (m.claimed) fail(409, 'already claimed')
    m.claimed = true; db.cells += m.amount; save()
    return delay({ claimed: m.amount, cells: db.cells })
  },
  async claimAllMail() {
    let n = 0
    db.mail.forEach((m) => { if (!m.claimed) { m.claimed = true; n += m.amount } })
    db.cells += n; save()
    return delay({ claimed: n, cells: db.cells })
  },

  async shop() {
    const kind = (k: string): T.ShopItem['kind'] => (k === 'consumable' ? 'consumable' : k === 'pet_accessory' ? 'accessory' : k === 'battle_background' ? 'battle_background' : 'room')
    return delay(shopJson.items.filter((i) => i.kind !== 'battle').map((i) => ({ id: i.id, nameKo: i.name_ko, kind: kind(i.kind), price: i.price, owned: db.items[i.id] ?? 0 })))
  },
  async buy(itemId) {
    const it = shopJson.items.find((i) => i.id === itemId && i.kind !== 'battle') ?? fail(404, 'no item')
    if (!db.flags.room) fail(403, 'shop opens after stage 1')
    if (db.cells < it.price) fail(402, 'not enough cells')
    if (it.kind !== 'consumable' && db.items[itemId]) fail(409, 'already owned')
    db.cells -= it.price
    db.items[itemId] = (db.items[itemId] ?? 0) + 1
    save()
    const item = (await mockApi.shop()).find((i) => i.id === itemId)!
    return { cells: db.cells, item }
  },
}
