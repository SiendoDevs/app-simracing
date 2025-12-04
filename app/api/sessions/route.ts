import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { parseSession } from '@/lib/parseSession'
import path from 'node:path'
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

export async function GET() {
  try {
    const sessions: ReturnType<typeof parseSession>[] = []
    try {
      const redis = createRedis()
      let curr: unknown = null
      try { curr = await redis.json.get('sessions') } catch {}
      if (!Array.isArray(curr) && (!curr || typeof curr !== 'object')) {
        try { const s = await redis.get('sessions'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
      }
      const items: unknown[] = Array.isArray(curr)
        ? (curr as unknown[])
        : curr && typeof curr === 'object'
          ? Object.values(curr as Record<string, unknown>)
          : []
      try { console.log('[api/sessions] GET items count', items.length) } catch {}
      for (const it of items) {
        const R = typeof it === 'string' ? (() => { try { return JSON.parse(it as string) } catch { return null } })() : (it as Record<string, unknown>)
        if (!R || typeof R !== 'object') continue
        const fp = typeof (R as Record<string, unknown>).sourceFilePath === 'string' ? ((R as Record<string, unknown>).sourceFilePath as string) : 'upstash:session.json'
        try {
          const s = parseSession(R as Record<string, unknown>, fp)
          sessions.push(s)
        } catch {}
      }
    } catch {}
    sessions.sort((a, b) => a.id.localeCompare(b.id))
    try { console.log('[api/sessions] GET sessions count', sessions.length) } catch {}
    return NextResponse.json(sessions)
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
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
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const headerName = (req.headers.get('x-filename') || '').trim()
    const baseNameRaw = headerName ? path.basename(headerName) : 'session.json'
    const baseName = baseNameRaw.toLowerCase().endsWith('.json') ? baseNameRaw : `${baseNameRaw}.json`
    try {
      const redis = createRedis()
      const rawWithPath = { ...(body as Record<string, unknown>), sourceFilePath: `upstash:${baseName}` }
      let curr: unknown = null
      try { curr = await redis.json.get('sessions') } catch {}
      if (!Array.isArray(curr)) {
        try { const s = await redis.get('sessions'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
      }
      const listU = Array.isArray(curr) ? (curr as Array<Record<string, unknown>>) : []
      const idNew = parseSession(rawWithPath as Record<string, unknown>, `upstash:${baseName}`).id
      const exists = listU.some((x) => {
        const raw = x as Record<string, unknown>
        const fp = typeof raw.sourceFilePath === 'string' ? (raw.sourceFilePath as string) : 'upstash:session.json'
        const sid = parseSession(raw, fp).id
        return sid === idNew
      })
      if (exists) return NextResponse.json({ error: 'duplicate', detail: idNew }, { status: 409 })
      const next = [...listU, rawWithPath]
      try { await redis.json.set('sessions', '$', next) } catch {
        await redis.set('sessions', JSON.stringify(next))
      }
      return NextResponse.json({ ok: true, pathname: `upstash:${baseName}` })
    } catch (e) {
      return NextResponse.json({ error: 'kv_write_failed', detail: String(e) }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
