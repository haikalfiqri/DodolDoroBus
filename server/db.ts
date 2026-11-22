import pg from 'pg'

// DATE -> 'YYYY-MM-DD' string, NUMERIC -> number (pg returns strings by default)
pg.types.setTypeParser(1082, (v: string) => v)
pg.types.setTypeParser(1700, (v: string) => parseFloat(v))
pg.types.setTypeParser(20, (v: string) => parseInt(v, 10))

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
const local = /localhost|127\.0\.0\.1|host=\//.test(url)

// Small pool: on Vercel every function instance has its own pool; Neon's pooled URL does the real pooling.
export const pool = new pg.Pool({ connectionString: url, max: 3, ssl: local ? false : { rejectUnauthorized: false } })

export type Db = pg.PoolClient | pg.Pool

export async function q<R extends pg.QueryResultRow = any>(db: Db, sql: string, params: unknown[] = []): Promise<R[]> {
  return (await db.query<R>(sql, params)).rows
}
export async function one<R extends pg.QueryResultRow = any>(db: Db, sql: string, params: unknown[] = []): Promise<R | undefined> {
  return (await db.query<R>(sql, params)).rows[0]
}

/** Run fn inside one transaction: everything commits together or nothing does. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    const r = await fn(c)
    await c.query('COMMIT')
    return r
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

/** Today's date in Korea (the game day resets at 00:00 KST). */
export function kstDay(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3600e3 + offsetDays * 864e5).toISOString().slice(0, 10)
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5)
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
export function fail(status: number, msg: string): never {
  throw new HttpError(status, msg)
}
