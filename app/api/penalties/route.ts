import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { currentUser } from '@clerk/nextjs/server'

export const runtime = 'nodejs'

// removed Vercel KV; using Upstash Redis only

function resolveUpstashEnv() {
  const candidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_REDIS_URL,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_KV_URL,
  ].filter(Boolean) as string[]
  const url = candidates.find((u) => typeof u === 'string' && u.startsWith('https://')) || ''
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN ||
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

export async function GET() {
  try {
    const redis = createRedis()
    try {
      const data = await redis.json.get('penalties')
      if (Array.isArray(data)) return NextResponse.json(data)
      if (data && typeof data === 'object') return NextResponse.json(Object.values(data as Record<string, unknown>))
    } catch {}
    try {
      const s = await redis.get('penalties')
      if (typeof s === 'string') {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return NextResponse.json(parsed)
        if (parsed && typeof parsed === 'object') return NextResponse.json(Object.values(parsed))
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
      try {
        const user = await currentUser()
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
        const isAdmin = !!user && (
          (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
          user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
        )
        if (isAdmin) isAllowed = true
      } catch {}
    }
    if (!isAllowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; seconds?: number; confirmed?: boolean } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, seconds } = body
    if (!driverId || !sessionId || typeof seconds !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    try {
      const sessions = await loadLocalSessions()
      const target = sessions.find((s) => s.id === sessionId)
      if (target && (target.type || '').toUpperCase() === 'QUALIFY') {
        return NextResponse.json({ error: 'qualify_penalties_not_allowed' }, { status: 400 })
      }
    } catch {}
    const redis = createRedis()
    let curr: unknown = null
    try {
      curr = await redis.json.get('penalties')
    } catch {}
    if (!Array.isArray(curr)) {
      try {
        const s = await redis.get('penalties')
        if (typeof s === 'string') curr = JSON.parse(s)
      } catch {}
    }
    const list: Array<{ driverId: string; sessionId: string; seconds: number; confirmed?: boolean }> = Array.isArray(curr)
      ? (curr as Array<{ driverId: string; sessionId: string; seconds: number; confirmed?: boolean }>)
      : []
    const idx = list.findIndex((x) => x.driverId === driverId && x.sessionId === sessionId)
    const confirmed = body.confirmed === true
    const secs: number = seconds as number
    if (secs <= 0) {
      if (confirmed) {
        if (idx >= 0) list.splice(idx, 1)
      } else {
        if (idx >= 0) list[idx] = { driverId, sessionId, seconds: 0, confirmed: false }
        else list.push({ driverId, sessionId, seconds: 0, confirmed: false })
      }
    } else {
      if (idx >= 0) list[idx] = { driverId, sessionId, seconds: secs, confirmed }
      else list.push({ driverId, sessionId, seconds: secs, confirmed })
    
    }
    const redis2 = createRedis()
    let writeOk = false
    let lastError: unknown = null
    try {
      await redis2.json.set('penalties', '$', list)
      writeOk = true
    } catch (e) {
      lastError = e
    }
    if (!writeOk) {
      try {
        await redis2.set('penalties', JSON.stringify(list))
        writeOk = true
      } catch (e) {
        lastError = e
      }
    }
    if (!writeOk) return NextResponse.json({ error: 'write_failed', detail: String(lastError ?? '') }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
