import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { currentUser } from '@clerk/nextjs/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { revalidatePath } from 'next/cache'

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

function upstashConfigured() {
  const { url, token } = resolveUpstashEnv()
  return !!(url && token)
}

function createRedis() {
  const { url, token } = resolveUpstashEnv()
  if (url && token) return new Redis({ url, token })
  return Redis.fromEnv()
}

type Pub = { sessionId: string; published: boolean; date?: string; by?: string }
function isPub(x: unknown): x is Pub {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.sessionId === 'string' && typeof o.published === 'boolean'
}

export async function GET() {
  try {
    try { console.log('[api/published] GET start', { hasUrl: !!process.env.UPSTASH_REDIS_REST_URL || !!process.env.UPSTASH_REDIS_URL }) } catch {}
    const redis = createRedis()
    try {
      const data = await redis.json.get('published')
      try { console.log('[api/published] json.get count', Array.isArray(data) ? data.length : (data ? Object.keys(data as Record<string, unknown>).length : 0)) } catch {}
      if (Array.isArray(data)) return NextResponse.json(data.filter(isPub))
      if (data && typeof data === 'object') return NextResponse.json(Object.values(data as Record<string, unknown>).filter(isPub))
    } catch {}
    try {
      const s = await redis.get('published')
      if (typeof s === 'string') {
        const parsed = JSON.parse(s)
        try { console.log('[api/published] get count', Array.isArray(parsed) ? parsed.length : (parsed ? Object.keys(parsed as Record<string, unknown>).length : 0)) } catch {}
        if (Array.isArray(parsed)) return NextResponse.json(parsed.filter(isPub))
        if (parsed && typeof parsed === 'object') return NextResponse.json(Object.values(parsed as Record<string, unknown>).filter(isPub))
      }
    } catch {}
  } catch {}
  return NextResponse.json([])
}

export async function POST(req: Request) {
  try {
    if (!upstashConfigured()) return NextResponse.json({ error: 'redis_not_configured' }, { status: 500 })
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    let isAllowed = false
    const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
    if (devBypass) isAllowed = true
    if (adminToken && adminToken.length > 0 && adminToken === headerToken) {
      isAllowed = true
    } else {
      const user = await currentUser().catch(() => null)
      const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      const isAdmin = !!user && (
        (user?.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
        user?.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
      )
      if (isAdmin) isAllowed = true
    }
    if (!isAllowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json().catch(() => null) as { sessionId?: string; published?: boolean; date?: string } | null
    if (!body || typeof body.sessionId !== 'string' || typeof body.published !== 'boolean') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const sessions = await loadLocalSessions().catch(() => [])
    const exists = sessions.some((s) => s.id === body.sessionId)
    if (!exists) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    let list: Pub[] = []
    const redis = createRedis()
    let curr: unknown = null
    try { curr = await redis.json.get('published') } catch {}
    if (!Array.isArray(curr)) {
      try { const s = await redis.get('published'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
    }
    list = Array.isArray(curr) ? (curr as Pub[]) : []
    const idx = list.findIndex((x) => x.sessionId === body.sessionId)
    const now = typeof body.date === 'string' && body.date.length > 0 ? body.date : new Date().toISOString()
    if (idx >= 0) list[idx] = { ...list[idx], sessionId: body.sessionId, published: body.published, date: now }
    else list.push({ sessionId: body.sessionId, published: body.published, date: now })
    let writeOk = false
    let lastError: unknown = null
    try { await redis.json.set('published', '$', list); writeOk = true } catch (e) { lastError = e }
    if (!writeOk) {
      try { await redis.set('published', JSON.stringify(list)); writeOk = true } catch (e) { lastError = e }
    }
    try { console.log('[api/published] POST writeOk', writeOk, { size: list.length, lastError: String(lastError ?? '') }) } catch {}
    if (!writeOk) return NextResponse.json({ error: 'write_failed', detail: String(lastError ?? '') }, { status: 500 })
    try {
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
