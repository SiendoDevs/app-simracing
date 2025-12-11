import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import fs from 'node:fs'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { parseSession } from '@/lib/parseSession'
import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

// removed kv configuration; using Upstash Redis only

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

async function loadLinked(key: 'penalties' | 'exclusions' | 'ballast' | 'points') {
  try {
    const redis = createRedis()
    let curr: unknown = null
    try { curr = await redis.json.get(key) } catch {}
    if (!Array.isArray(curr)) {
      try {
        const s = await redis.get(key)
        if (typeof s === 'string') curr = JSON.parse(s)
      } catch {}
    }
    if (Array.isArray(curr)) return curr as Array<Record<string, unknown>>
    if (curr && typeof curr === 'object') return Object.values(curr as Record<string, unknown>) as Array<Record<string, unknown>>
  } catch {}
  return []
}

async function saveLinked(key: 'penalties' | 'exclusions' | 'ballast' | 'points', list: Record<string, unknown>[]) {
  try {
    const redis = createRedis()
    try {
      const payload = list.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      await redis.json.set(key, '$', payload)
      return true
    } catch {}
    try {
      await redis.set(key, JSON.stringify(list))
      return true
    } catch {}
  } catch {}
  return false
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    let isAllowed = false
    const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
    if (devBypass) isAllowed = true
    if (adminToken && adminToken.length > 0 && adminToken === headerToken) {
      isAllowed = true
    }
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
    if (!isAllowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const sessions = await loadLocalSessions()
    const target = sessions.find((s) => s.id === id)
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // Check linked data (confirmed entries) and optionally block
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'
    const cascade = url.searchParams.get('cascade') === '1'
    const pens = await loadLinked('penalties')
    const excls = await loadLinked('exclusions')
    const balls = await loadLinked('ballast')
    const points = await loadLinked('points')
    const isConfirmedForId = (x: unknown): boolean => {
      if (!x || typeof x !== 'object') return false
      const obj = x as Record<string, unknown>
      const sid = obj.sessionId
      const conf = obj.confirmed
      return typeof sid === 'string' && sid === id && conf === true
    }
    const confirmed = {
      penalties: pens.filter(isConfirmedForId).length,
      exclusions: excls.filter(isConfirmedForId).length,
      ballast: balls.filter(isConfirmedForId).length,
      points: points.filter(isConfirmedForId).length,
    }
    const hasConfirmed = confirmed.penalties + confirmed.exclusions + confirmed.ballast > 0
    if (hasConfirmed && !force) {
      return NextResponse.json({ error: 'linked_confirmed_exists', detail: confirmed }, { status: 409 })
    }

    const filePath = target.sourceFilePath
    try {
      if (filePath && filePath.startsWith('upstash:')) {
        try {
          const redis = createRedis()
          let curr: unknown = null
          try { curr = await redis.json.get('sessions') } catch {}
          if (!Array.isArray(curr)) {
            try { const s = await redis.get('sessions'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
          }
          const listU = Array.isArray(curr) ? (curr as Array<Record<string, unknown>>) : []
          const kept = listU.filter((x) => {
            const raw = x as Record<string, unknown>
            const fp = typeof raw.sourceFilePath === 'string' ? (raw.sourceFilePath as string) : 'upstash:session.json'
            try {
              const s = parseSession(raw, fp)
              return s.id !== id
            } catch {
              return true
            }
          })
          try { await redis.json.set('sessions', '$', kept) } catch {
            await redis.set('sessions', JSON.stringify(kept))
          }
        } catch (e) {
          return NextResponse.json({ error: 'kv_unlink_failed', detail: String(e) }, { status: 500 })
        }
      } else if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (e) {
      return NextResponse.json({ error: 'unlink_failed', detail: String(e) }, { status: 500 })
    }
    if (force && cascade) {
      const keepIfNotId = (x: Record<string, unknown>): boolean => {
        const sid = x.sessionId as unknown
        return !(typeof sid === 'string' && sid === id)
      }
      const pensKept = pens.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').filter(keepIfNotId)
      const exclsKept = excls.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').filter(keepIfNotId)
      const ballsKept = balls.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').filter(keepIfNotId)
      const pointsKept = points.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').filter(keepIfNotId)
      let ok = true
      ok = ok && await saveLinked('penalties', pensKept)
      ok = ok && await saveLinked('exclusions', exclsKept)
      ok = ok && await saveLinked('ballast', ballsKept)
      ok = ok && await saveLinked('points', pointsKept)
      if (!ok) return NextResponse.json({ error: 'cascade_write_failed' }, { status: 500 })
      return NextResponse.json({ ok: true, cascaded: true })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
