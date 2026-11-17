import type * as T from './types'
import { mockApi } from './mock/mockApi'

/**
 * Screens import `api` from here and never call fetch themselves.
 * VITE_USE_MOCK=true  -> src/api/mock (no backend needed)
 * VITE_USE_MOCK=false -> real server at VITE_API_BASE (default /api, proxied in vite.config.ts)
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BASE: string = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function http<R>(method: string, path: string, body?: unknown): Promise<R> {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include', // DOROBUS login session
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return (await res.json()) as R
}

const realApi: T.Api = {
  me: () => http('GET', '/me'),
  onboarding: (petName) => http('POST', '/onboarding', { petName }),
  chapters: () => http('GET', '/chapters'),
  stages: (chapterId) => http('GET', `/chapters/${chapterId}/stages`),

  startBattle: (req) => http('POST', '/battles', req),
  useSkill: (id, skillId) => http('POST', `/battles/${id}/skill`, { skillId }),
  answer: (id, questionId, answer) => http('POST', `/battles/${id}/answer`, { questionId, answer }),
  hint: (id) => http('POST', `/battles/${id}/hint`),
  finish: (id) => http('POST', `/battles/${id}/finish`),

  pets: () => http('GET', '/pets'),
  setPartner: (petId) => http('PATCH', `/pets/${petId}`, { isPartner: true }),
  renamePet: (petId, nickname) => http('PATCH', `/pets/${petId}`, { nickname }),
  feed: (petId) => http('POST', `/pets/${petId}/feed`),

  eggs: () => http('GET', '/eggs'),
  moveEggToNest: (eggId) => http('POST', `/eggs/${eggId}/nest`),
  hatch: (eggId) => http('POST', `/eggs/${eggId}/hatch`),
  dex: () => http('GET', '/dex'),

  mail: () => http('GET', '/mail'),
  claimMail: (id) => http('POST', `/mail/${id}/claim`),
  claimAllMail: () => http('POST', '/mail/claim-all'),

  shop: () => http('GET', '/shop'),
  buy: (itemId) => http('POST', '/shop/buy', { itemId }),
}

export const api: T.Api = USE_MOCK ? mockApi : realApi
export const usingMock = USE_MOCK
