/**
 * API contract between frontend (Wafi) and backend (Akip).
 * Source: docs/design/data_model.md "API draft". Change this file only together,
 * in one pull request, so the mock and the real server never drift apart.
 *
 * Rule from the docs: the SERVER picks questions, checks answers, rolls eggs and
 * computes rewards. The client never sends scores, stars or rarities, and never
 * receives the correct answer before the student answers.
 */

export type Category = 'digital' | 'ai' | 'making' | 'computing'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic'
export type MissionType = 'choice4' | 'ox' | 'order' | 'keyword' | 'command_order' | 'pixel_art' | 'puzzle'
export type Mood = 'calm' | 'curious' | 'tense' | 'sad' | 'harmony'
export type PetForm = 'baby' | 'junior' | 'adult' | 'shining'
export type EggSlot = 'stage3' | 'stage6' | 'boss'
export type EggSource = 'STARTER' | 'STORY' | 'REPLAY' | 'QUEST' | 'ACHIEVEMENT' | 'PITY'
export type BattleMode = 'STORY' | 'GHOST' | 'TRIAL'
export type Stars = 0 | 1 | 2 | 3

/* ---------- player & pets ---------- */

export interface SkillInfo {
  id: string
  nameKo: string
  category: Category
  /** final power for this pet: power by level x 1.2 if the type matches */
  power: number
  signature: boolean
}

export interface Pet {
  id: number
  speciesId: string // 'dog', 'fox', ... (content/pets.json)
  nickname: string
  rarity: Rarity
  type: Category
  level: number
  xp: number
  xpToNext: number // 0 at level 10
  form: PetForm
  isPartner: boolean
  mood: Mood
  fedToday: boolean
  skills: SkillInfo[] // always 4
  passiveKo: string | null
}

export interface Me {
  nickname: string
  cells: number
  unclaimedMail: number
  onboarded: boolean
  partner: Pet | null
  battleRoomUnlocked: boolean
  mythicPity: number // 0..50
  nestSlots: number
  unlocked: { myRoom: boolean; shop: boolean; quests: boolean; hint: boolean; nest: boolean }
  today: { rewardedBattles: number; cellsEarned: number; firstClearBonusAvailable: boolean }
}

export interface OnboardingRes {
  me: Me
  pet: Pet
}

/* ---------- chapters & stages ---------- */

export interface Chapter {
  id: number
  nameKo: string
  status: 'playable' | 'planned'
  locked: boolean
  cleared: number
  total: number
}

export interface DropRate {
  rarity: Rarity
  percent: number
}

export interface StageSummary {
  id: string // 'c1s3'
  chapterId: number
  order: number
  isBoss: boolean
  nameKo: string
  anomalyKo: string
  gauge: number
  maxRounds: number
  categories: Category[]
  missionTypes: MissionType[]
  difficulty: 'easy' | 'normal' | 'hard'
  locked: boolean
  bestStars: Stars
  firstCleared: boolean
  eggSlot: EggSlot | null
  firstClearEgg: Rarity | null
  /** replay drop rates, shown on the stage card; null if not an egg stage */
  dropRates: DropRate[] | null
}

export interface DialogueLine {
  speaker: 'codex' | 'naty' | 'rico' | 'zero' | 'xylo' | 'void' | 'sys'
  text: string // may contain {pet} and {player}
}

/* ---------- battle ---------- */

/**
 * What the student sees. Order/choice lists are ALREADY SHUFFLED by the server,
 * and the answer is given as positions in these shown lists.
 */
export type QuestionPayload =
  | { kind: 'choice4'; choices: string[] }
  | { kind: 'ox' }
  | { kind: 'order'; items: string[] }
  | { kind: 'command_order'; items: string[] }
  | { kind: 'keyword' }
  | { kind: 'pixel_art'; size: number; target: string[] }
  | { kind: 'puzzle'; seq: (string | number)[]; choices: (string | number)[] }

export interface Question {
  id: string
  category: Category
  missionType: MissionType
  prompt: string
  payload: QuestionPayload
  timeLimitS: number // passives already applied (penguin, snow leopard)
  hintAvailable: boolean // Rico's hint: choice4 / puzzle only, once per battle
}

/**
 * choice4 / puzzle: index in shown choices · ox: 'O' | 'X' · keyword: text
 * order / command_order: shown indexes in the chosen order · pixel_art: 0/1 per cell, row by row
 * null: time ran out
 */
export type Answer = number | 'O' | 'X' | string | number[] | null

export type BattlePhase = 'PICK_SKILL' | 'PET_QUESTION' | 'ANOMALY_QUESTION' | 'WON' | 'LOST'

export interface BattleState {
  battleId: string
  stageId: string
  mode: BattleMode
  phase: BattlePhase
  round: number
  maxRounds: number
  energy: number
  maxEnergy: number
  gauge: number
  maxGauge: number
  combo: number // 1.0 .. 2.0
  pet: Pet
  ghost: { nickname: string; score: number } | null
}

export interface StartBattleReq {
  stageId: string
  petId: number
  mode: BattleMode
  ghostOf?: string // friend code, GHOST mode only
}

export interface StartBattleRes {
  state: BattleState
  /** stage intro lines, only on the first attempt; empty otherwise */
  intro: DialogueLine[]
}

export interface SkillRes {
  state: BattleState
  question: Question
}

export interface AnswerEffect {
  kind: 'DAMAGE' | 'MISS' | 'DODGE' | 'HIT'
  amount: number // gauge damage, combo after dodge, or energy lost
  noteKo: string // e.g. "코드 웨이브! 게이지 -24", "🐼 느긋함: 절반만!"
}

export interface AnswerRes {
  correct: boolean
  correctAnswer: Answer // in shown positions, for the feedback panel
  explanation: string
  effect: AnswerEffect
  state: BattleState
  /** after a pet question that did not win: the anomaly's dodge question */
  nextQuestion: Question | null
}

export interface HintRes {
  removeChoiceIndex: number
  cells: number // balance after paying (eagle passive: free once a day)
}

export interface FinishRes {
  won: boolean
  stars: Stars
  xpGained: number
  levelUp: { from: number; to: number; newForm: PetForm | null; newSkillId: string | null } | null
  pet: Pet
  cellsMailed: number // 0 in practice mode or on a loss
  firstClearOfDayBonus: boolean
  practiceMode: boolean // daily limit reached: XP only
  egg: { id: number; rarity: Rarity; source: EggSource; inNest: boolean } | null
  eggNoteKo: string
  unlocksKo: string[]
  record: { score: number; accuracy: number; energyLeft: number; isBest: boolean }
  ghost: { mine: number; theirs: number; won: boolean } | null
  /** win/lose lines to show before the result screen */
  dialogue: DialogueLine[]
}

/* ---------- eggs, room, mail, shop ---------- */

export interface Egg {
  id: number
  rarity: Rarity
  source: EggSource
  warmth: number
  warmthNeeded: number
  nestSlot: number | null // null = in the egg box
  ready: boolean
}

export interface HatchRes {
  result: 'PET' | 'SNACK'
  pet: Pet | null // PET: new pet, still named after the species
  snackXpTo: Pet | null // SNACK: the partner that got +100 XP
}

export interface DexEntry {
  speciesId: string
  rarity: Rarity
  owned: boolean
}

export interface Mail {
  id: string
  title: string
  amount: number
  createdAt: string
  claimed: boolean
}

export interface ClaimRes {
  claimed: number // cells added
  cells: number // new balance
}

export interface ShopItem {
  id: string
  nameKo: string
  kind: 'consumable' | 'room' | 'accessory' | 'battle_background'
  price: number
  owned: number
}

/* ---------- the whole API (real server and mock both implement this) ---------- */

export interface Api {
  me(): Promise<Me>
  onboarding(petName: string): Promise<OnboardingRes>
  chapters(): Promise<Chapter[]>
  stages(chapterId: number): Promise<StageSummary[]>

  startBattle(req: StartBattleReq): Promise<StartBattleRes>
  useSkill(battleId: string, skillId: string): Promise<SkillRes>
  answer(battleId: string, questionId: string, answer: Answer): Promise<AnswerRes>
  hint(battleId: string): Promise<HintRes>
  finish(battleId: string): Promise<FinishRes>

  pets(): Promise<Pet[]>
  setPartner(petId: number): Promise<Pet[]>
  renamePet(petId: number, nickname: string): Promise<Pet>
  feed(petId: number): Promise<{ pet: Pet; cells: number }>

  eggs(): Promise<Egg[]>
  moveEggToNest(eggId: number): Promise<Egg[]>
  hatch(eggId: number): Promise<HatchRes>
  dex(): Promise<DexEntry[]>

  mail(): Promise<Mail[]>
  claimMail(mailId: string): Promise<ClaimRes>
  claimAllMail(): Promise<ClaimRes>

  shop(): Promise<ShopItem[]>
  buy(itemId: string): Promise<{ cells: number; item: ShopItem }>
}
