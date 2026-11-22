import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { fail } from './db.js'

// Secret for signing login tokens. Set JWT_SECRET in Vercel; falls back to a hash of the DB URL so the demo still works.
const SECRET = process.env.JWT_SECRET || createHash('sha256').update('codex:' + (process.env.DATABASE_URL ?? 'dev')).digest('hex')
const COOKIE = 'ct_session'
const DAYS = 7

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(pw, salt, 32).toString('hex')}`
}
export function checkPassword(pw: string, stored: string): boolean {
  const [, salt, hash] = stored.split('$')
  if (!salt || !hash) return false
  const a = scryptSync(pw, salt, 32)
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export interface Session { id: number; role: 'STUDENT' | 'ADMIN' }

/** token = base64url(payload).signature  (a minimal JWT-style signed token, HMAC-SHA256) */
export function signToken(s: Session): string {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + DAYS * 864e5 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}
export function readToken(t: string | undefined): Session | null {
  if (!t) return null
  const [body, sig] = t.split('.')
  if (!body || !sig) return null
  const good = createHmac('sha256', SECRET).update(body).digest('base64url')
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null
  const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session & { exp: number }
  return p.exp > Date.now() ? { id: p.id, role: p.role } : null
}

function cookieValue(req: Request): string | undefined {
  const raw = req.headers.cookie ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return decodeURIComponent(v.join('='))
  }
  const h = req.headers.authorization
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined
}
export function setSession(res: Response, s: Session | null): void {
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', s
    ? `${COOKIE}=${signToken(s)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${secure}`
    : `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
}

declare module 'express-serve-static-core' {
  interface Request { session?: Session }
}
export function needLogin(req: Request, _res: Response, next: NextFunction): void {
  const s = readToken(cookieValue(req))
  if (!s) fail(401, 'login required')
  req.session = s
  next()
}
export function needAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.session?.role !== 'ADMIN') fail(403, 'admin only')
  next()
}
