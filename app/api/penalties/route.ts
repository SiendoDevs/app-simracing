import { NextResponse } from 'next/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { currentUser } from '@clerk/nextjs/server'
import { readRedisItems, upstashConfigured, writeRedisCollection } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET() {
  try {
    try { console.log('[api/penalties] GET start') } catch {}
    const items = await readRedisItems('penalties')
    try { console.log('[api/penalties] count', items.length) } catch {}
    return NextResponse.json(items)
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
    const items = await readRedisItems('penalties')
    const list: Array<{ driverId: string; sessionId: string; seconds: number; confirmed?: boolean }> = items.filter((x) => x && typeof x === 'object') as Array<{ driverId: string; sessionId: string; seconds: number; confirmed?: boolean }>
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
    const wr = await writeRedisCollection('penalties', list)
    if (!wr.ok) return NextResponse.json({ error: 'write_failed', detail: wr.error ?? '' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
