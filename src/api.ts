/** All server calls. Screens never call fetch directly. */
import type * as T from './types'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
async function http<R>(method: string, path: string, body?: unknown): Promise<R> {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText)
  return data as R
}

export interface AdminQuestion {
  id: string; category_id: string; difficulty: string; mission_type_id: string; prompt: string; payload: any; answer: any
  explanation: string; status: 'draft' | 'approved' | 'hidden'; created_by: string; reports: number; accuracy: number | null; answered: number
}
export interface TrialLobby { unlocked: boolean; weekStart: string; questions: number; timeLimitS: number; myBest: number | null; myRuns: number; myRank: number | null; top: { nickname: string; score: number; me: boolean }[] }
export interface TrialQ { index: number; total: number; question: T.Question }
export interface TrialAnswer { correct: boolean; correctAnswer: T.Answer; explanation: string; timeLeft: number; combo: number; score: number; correctCount: number; done: boolean; next: TrialQ | null }
export interface QuestList { reward: number; quests: { id: string; textKo: string; target: number; progress: number; claimed: boolean }[]; stamps: number; stampsNeeded: number; weeklyEggGiven: boolean }
export interface WeeklyRow { category: string; name_ko: string; answered: number; accuracy: number; last_week: number }

export const api = {
  login: (username: string, password: string) => http<{ role: string }>('POST', '/auth/login', { username, password }),
  register: (username: string, password: string, nickname: string) => http<{ role: string }>('POST', '/auth/register', { username, password, nickname }),
  logout: () => http('POST', '/auth/logout'),

  me: () => http<T.Me>('GET', '/me'),
  onboarding: (petName: string) => http<T.OnboardingRes>('POST', '/onboarding', { petName }),
  chapters: () => http<T.Chapter[]>('GET', '/chapters'),
  stages: (chapterId: number) => http<T.StageSummary[]>('GET', `/chapters/${chapterId}/stages`),

  startBattle: (req: T.StartBattleReq) => http<T.StartBattleRes>('POST', '/battles', req),
  useSkill: (id: string, skillId: string) => http<T.SkillRes>('POST', `/battles/${id}/skill`, { skillId }),
  answer: (id: string, questionId: string, answer: T.Answer) => http<T.AnswerRes>('POST', `/battles/${id}/answer`, { questionId, answer }),
  hint: (id: string) => http<T.HintRes>('POST', `/battles/${id}/hint`),
  finish: (id: string) => http<T.FinishRes>('POST', `/battles/${id}/finish`),

  pets: () => http<T.Pet[]>('GET', '/pets'),
  setPartner: (petId: number) => http<T.Pet[]>('PATCH', `/pets/${petId}`, { isPartner: true }),
  renamePet: (petId: number, nickname: string) => http<T.Pet>('PATCH', `/pets/${petId}`, { nickname }),
  feed: (petId: number) => http<{ pet: T.Pet; cells: number }>('POST', `/pets/${petId}/feed`),

  eggs: () => http<T.Egg[]>('GET', '/eggs'),
  moveEggToNest: (eggId: number) => http<T.Egg[]>('POST', `/eggs/${eggId}/nest`),
  hatch: (eggId: number) => http<T.HatchRes>('POST', `/eggs/${eggId}/hatch`),
  dex: () => http<T.DexEntry[]>('GET', '/dex'),

  mail: () => http<T.Mail[]>('GET', '/mail'),
  claimMail: (id: string) => http<T.ClaimRes>('POST', `/mail/${id}/claim`),
  claimAllMail: () => http<T.ClaimRes>('POST', '/mail/claim-all'),
  shop: () => http<T.ShopItem[]>('GET', '/shop'),
  buy: (itemId: string) => http<{ cells: number; item: T.ShopItem }>('POST', '/shop/buy', { itemId }),
  ledger: () => http<{ delta: number; reason: string; ref: string | null; balance: number; created_at: string }[]>('GET', '/ledger'),
  weekly: () => http<WeeklyRow[]>('GET', '/report/weekly'),
  quests: () => http<QuestList>('GET', '/quests'),
  claimQuest: (id: string) => http<{ cellsMailed: number; stamp: boolean; weeklyEgg: string | null }>('POST', `/quests/${id}/claim`),
  friends: () => http<{ code: string; friends: { nickname: string; friend_code: string; records: { stageId: string; score: number; stars: number }[] }[]; mine: { stageId: string; score: number; stars: number }[] }>('GET', '/friends'),
  addFriend: (friendCode: string) => http<{ ok: boolean; nickname: string }>('POST', '/friends', { friendCode }),
  battleRoom: () => http<TrialLobby>('GET', '/battle-room'),
  trialStart: () => http<{ runId: string } & TrialQ>('POST', '/trial/start'),
  trialAnswer: (runId: string, answer: T.Answer) => http<TrialAnswer>('POST', `/trial/${runId}/answer`, { answer }),
  reportQuestion: (id: string, reason: string) => http('POST', `/questions/${id}/report`, { reason }),

  admin: {
    stats: () => http<any>('GET', '/admin/stats'),
    questions: (f: Record<string, string>) => http<AdminQuestion[]>('GET', '/admin/questions?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v))),
    create: (b: unknown) => http<AdminQuestion>('POST', '/admin/questions', b),
    update: (id: string, b: unknown) => http<AdminQuestion>('PUT', `/admin/questions/${id}`, b),
    setStatus: (id: string, status: string) => http('POST', `/admin/questions/${id}/status`, { status }),
    reports: () => http<{ id: number; reason: string; created_at: string; question_id: string; prompt: string; nickname: string }[]>('GET', '/admin/reports'),
    resolve: (id: number) => http('POST', `/admin/reports/${id}/resolve`),
    sqlList: () => http<{ id: string; title: string; why: string; sql: string }[]>('GET', '/admin/sql'),
    sqlRun: (id: string) => http<{ title: string; sql: string; ms: number; columns: string[]; rows: Record<string, unknown>[]; rowCount: number }>('GET', `/admin/sql/${id}`),
    settings: () => http<{ stages: any[]; eggs: any[]; drops: { slot: string; rarity_id: string; percent: number }[]; shop: any[]; rarities: string[] }>('GET', '/admin/settings'),
    setStage: (id: string, gauge: number, maxRounds: number) => http('PUT', `/admin/settings/stages/${id}`, { gauge, maxRounds }),
    setFirstEgg: (slot: string, rarity: string) => http('PUT', '/admin/settings/first-egg', { slot, rarity }),
    setDrop: (slot: string, rarity: string, percent: number) => http('PUT', '/admin/settings/drop', { slot, rarity, percent }),
    setPrice: (id: string, price: number) => http('PUT', `/admin/settings/shop/${id}`, { price }),
  },
}
