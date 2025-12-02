import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
// no local fallback
import { Redis } from '@upstash/redis'
import { loadLocalSessions } from '@/lib/loadLocalSessions'

export const runtime = 'nodejs'

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

// no explicit gating; createRedis already handles env resolution

function createRedis() {
  const { url, token } = resolveUpstashEnv()
  if (url && token) return new Redis({ url, token })
  return Redis.fromEnv()
}

export async function GET() {
  try {
    const redis = createRedis()
    let data: unknown = null
    try {
      data = await redis.json.get('exclusions')
    } catch {}
    if (Array.isArray(data)) return NextResponse.json(data)
    if (data && typeof data === 'object') {
      const values = Object.values(data as Record<string, unknown>)
      if (values.length > 0) return NextResponse.json(values)
    }
    try {
      const s = await redis.get('exclusions')
      if (typeof s === 'string') {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return NextResponse.json(parsed)
        if (parsed && typeof parsed === 'object') return NextResponse.json(Object.values(parsed))
      }
    } catch {}
    return NextResponse.json([])
  } catch {}
  return NextResponse.json([])
}

export async function POST(req: Request) {
  try {
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    let isAllowed = false
    const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
    if (devBypass) isAllowed = true
    if (adminToken && adminToken.length > 0 && adminToken === headerToken) {
      isAllowed = true
    } else {
      const user = await currentUser().catch(() => null)
      const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      const isAdmin = !!user && (
        (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
        user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
      )
      if (isAdmin) isAllowed = true
    }
    if (!isAllowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json()
    if (!body || typeof body.driverId !== 'string' || typeof body.sessionId !== 'string') {
      return NextResponse.json({ error: 'driverId y sessionId requeridos' }, { status: 400 })
    }
    const exclude = !!body.exclude
    try {
      const sessions = await loadLocalSessions()
      const target = sessions.find((s) => s.id === body.sessionId)
      if (target && (target.type || '').toUpperCase() === 'QUALIFY') {
        return NextResponse.json({ error: 'qualify_exclusions_not_allowed' }, { status: 400 })
      }
    } catch {}
    try {
      const redis = createRedis()
      let curr: unknown = null
      try {
        curr = await redis.json.get('exclusions')
      } catch {}
      if (!Array.isArray(curr)) {
        try {
          const s = await redis.get('exclusions')
          if (typeof s === 'string') curr = JSON.parse(s)
        } catch {}
      }
      const list = Array.isArray(curr) ? (curr as Array<{ driverId: string; sessionId: string; exclude: boolean }>) : []
      const idx = list.findIndex((x) => x.driverId === body.driverId && x.sessionId === body.sessionId)
      if (idx >= 0) list[idx] = { driverId: body.driverId, sessionId: body.sessionId, exclude }
      else list.push({ driverId: body.driverId, sessionId: body.sessionId, exclude })
      let writeOk = false
      let lastError: unknown = null
      try {
        await redis.json.set('exclusions', '$', list)
        writeOk = true
      } catch (e) {
        lastError = e
      }
      if (!writeOk) {
        try {
          await redis.set('exclusions', JSON.stringify(list))
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
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
