import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Redis } from '@upstash/redis'
import { loadBallast } from '@/lib/ballast'
import { currentUser } from '@clerk/nextjs/server'

export const runtime = 'nodejs'

function kvConfigured() {
  return !!(process.env.KV_URL && process.env.KV_REST_TOKEN)
}

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
    if (!kvConfigured() && !upstashConfigured()) {
      return NextResponse.json(loadBallast())
    }
    if (kvConfigured()) {
      const data = await kv.get('ballast')
      if (Array.isArray(data)) return NextResponse.json(data)
    } else {
      const redis = createRedis()
      try {
        const data = await redis.json.get('ballast')
        if (Array.isArray(data)) return NextResponse.json(data)
      } catch {}
      try {
        const s = await redis.get('ballast')
        if (typeof s === 'string') {
          const parsed = JSON.parse(s)
          if (Array.isArray(parsed)) return NextResponse.json(parsed)
        }
      } catch {}
    }
    return NextResponse.json([])
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!kvConfigured() && !upstashConfigured()) return NextResponse.json({ error: 'kv_not_configured' }, { status: 500 })
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
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; kg?: number } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, kg } = body
    if (!driverId || !sessionId || typeof kg !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    let list: Array<{ driverId: string; sessionId: string; kg: number }>
    if (kvConfigured()) {
      const curr = await kv.get('ballast')
      list = Array.isArray(curr) ? (curr as Array<{ driverId: string; sessionId: string; kg: number }>) : []
    } else {
      const redis = createRedis()
      let curr: unknown = null
      try {
        curr = await redis.json.get('ballast')
      } catch {}
      if (!Array.isArray(curr)) {
        try {
          const s = await redis.get('ballast')
          if (typeof s === 'string') curr = JSON.parse(s)
        } catch {}
      }
      list = Array.isArray(curr) ? (curr as Array<{ driverId: string; sessionId: string; kg: number }>) : []
    }
    const idx = list.findIndex((x) => x.driverId === driverId && x.sessionId === sessionId)
    if (kg <= 0) {
      if (idx >= 0) list.splice(idx, 1)
    } else {
      if (idx >= 0) list[idx] = { driverId, sessionId, kg }
      else list.push({ driverId, sessionId, kg })
    }
    if (kvConfigured()) {
      await kv.set('ballast', list)
    } else {
      const redis = createRedis()
      let writeOk = false
      let lastError: unknown = null
      try {
        await redis.json.set('ballast', '$', list)
        writeOk = true
      } catch (e) {
        lastError = e
      }
      if (!writeOk) {
        try {
          await redis.set('ballast', JSON.stringify(list))
          writeOk = true
        } catch (e) {
          lastError = e
        }
      }
      if (!writeOk) return NextResponse.json({ error: 'write_failed', detail: String(lastError ?? '') }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
