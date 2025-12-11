import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

function resolveUpstashEnv() {
  const candidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_REDIS_URL,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_KV_URL,
    process.env.UPSTASH_REDIS_URL,
  ].filter(Boolean) as string[]
  const url = candidates.find((u) => typeof u === 'string' && u.startsWith('https://')) || ''
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN ||
    ''
  )
  return { url, token }
}

function createRedis() {
  const { url, token } = resolveUpstashEnv()
  if (url && token) return new Redis({ url, token })
  return Redis.fromEnv()
}

type Entry = { sessionId: string; points: number[]; confirmed?: boolean }

export async function GET() {
  try {
    const redis = createRedis()
    let curr: unknown = null
    try { curr = await redis.json.get('points') } catch {}
    if (!Array.isArray(curr)) {
      try { const s = await redis.get('points'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
    }
    if (Array.isArray(curr)) return NextResponse.json(curr)
    if (curr && typeof curr === 'object') return NextResponse.json(Object.values(curr as Record<string, unknown>))
  } catch {}
  return NextResponse.json([])
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as Partial<Entry> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const pointsArr = Array.isArray(body.points) ? body.points.filter((n) => Number.isFinite(n) && n >= 0).map((n) => Math.floor(n)) : []
    const confirmed = body.confirmed === true
    if (!sessionId) return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    const redis = createRedis()
    let curr: unknown = null
    try { curr = await redis.json.get('points') } catch {}
    if (!Array.isArray(curr)) {
      try { const s = await redis.get('points'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
    }
    const list: Entry[] = Array.isArray(curr) ? (curr as Entry[]) : []
    const idx = list.findIndex((x) => x.sessionId === sessionId)
    if (pointsArr.length === 0 && confirmed) {
      if (idx >= 0) list.splice(idx, 1)
    } else {
      const entry: Entry = { sessionId, points: pointsArr, confirmed }
      if (idx >= 0) list[idx] = entry
      else list.push(entry)
    }
    const redis2 = createRedis()
    let writeOk = false
    let lastError: unknown = null
    try { await redis2.json.set('points', '$', list); writeOk = true } catch (e) { lastError = e }
    if (!writeOk) { try { await redis2.set('points', JSON.stringify(list)); writeOk = true } catch (e) { lastError = e } }
    if (!writeOk) return NextResponse.json({ error: 'write_failed', detail: String(lastError ?? '') }, { status: 500 })
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/sessions')
      revalidatePath('/sessions/[id]')
      revalidatePath('/drivers')
      revalidatePath('/championship')
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
