import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
// no local fallback
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { readRedisItems, writeRedisCollection } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET() {
  try {
    try { console.log('[api/exclusions] GET start') } catch {}
    const items = await readRedisItems('exclusions')
    try { console.log('[api/exclusions] count', items.length) } catch {}
    return NextResponse.json(items)
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
    const confirmed = body.confirmed === true
    try {
      const sessions = await loadLocalSessions()
      const target = sessions.find((s) => s.id === body.sessionId)
      if (target && (target.type || '').toUpperCase() === 'QUALIFY') {
        return NextResponse.json({ error: 'qualify_exclusions_not_allowed' }, { status: 400 })
      }
    } catch {}
    try {
      const items = await readRedisItems('exclusions')
      const list = items.filter((x) => x && typeof x === 'object') as Array<{ driverId: string; sessionId: string; exclude: boolean; confirmed?: boolean }>
      const idx = list.findIndex((x) => x.driverId === body.driverId && x.sessionId === body.sessionId)
      if (idx >= 0) list[idx] = { driverId: body.driverId, sessionId: body.sessionId, exclude, confirmed }
      else list.push({ driverId: body.driverId, sessionId: body.sessionId, exclude, confirmed })
      const wr = await writeRedisCollection('exclusions', list)
      if (!wr.ok) return NextResponse.json({ error: 'write_failed', detail: wr.error ?? '' }, { status: 500 })
      return NextResponse.json({ ok: true })
    } catch (e) {
      return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
