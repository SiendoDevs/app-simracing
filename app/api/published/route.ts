import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { revalidatePath } from 'next/cache'
import { readRedisItems, upstashConfigured, writeRedisCollection } from '@/lib/redis'

export const runtime = 'nodejs'

type Pub = { sessionId: string; published: boolean; date?: string; by?: string }
function isPub(x: unknown): x is Pub {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.sessionId === 'string' && typeof o.published === 'boolean'
}

export async function GET() {
  try {
    try { console.log('[api/published] GET start', { hasUrl: !!process.env.UPSTASH_REDIS_REST_URL || !!process.env.UPSTASH_REDIS_URL }) } catch {}
    const items = await readRedisItems('published')
    const list = items.filter(isPub)
    try { console.log('[api/published] count', list.length) } catch {}
    return NextResponse.json(list)
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
    const items = await readRedisItems('published')
    const list: Pub[] = items.filter(isPub)
    const idx = list.findIndex((x) => x.sessionId === body.sessionId)
    const now = typeof body.date === 'string' && body.date.length > 0 ? body.date : new Date().toISOString()
    if (idx >= 0) list[idx] = { ...list[idx], sessionId: body.sessionId, published: body.published, date: now }
    else list.push({ sessionId: body.sessionId, published: body.published, date: now })
    const wr = await writeRedisCollection('published', list)
    try { console.log('[api/published] POST writeOk', wr.ok, { size: list.length, lastError: String(wr.error ?? '') }) } catch {}
    if (!wr.ok) return NextResponse.json({ error: 'write_failed', detail: wr.error ?? '' }, { status: 500 })
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
