import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { readRedisItems, upstashConfigured, writeRedisCollection } from '@/lib/redis'

export const runtime = 'nodejs'

function isValidBallast(x: unknown): x is { driverId: string; sessionId: string; kg: number } {
  if (!x || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (typeof obj.driverId === 'string' && typeof obj.sessionId === 'string' && typeof obj.kg === 'number')
}

export async function GET() {
  try {
    if (!upstashConfigured()) return NextResponse.json([])
    const items = await readRedisItems('ballast')
    return NextResponse.json(items.filter(isValidBallast))
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
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
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; kg?: number; confirmed?: boolean } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, kg } = body
    if (!driverId || !sessionId || typeof kg !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    const items = await readRedisItems('ballast')
    const list: Array<{ driverId: string; sessionId: string; kg: number; confirmed?: boolean }> = items.filter((x) => x && typeof x === 'object') as Array<{ driverId: string; sessionId: string; kg: number; confirmed?: boolean }>
    const idx = list.findIndex((x) => x.driverId === driverId && x.sessionId === sessionId)
    const confirmed = body.confirmed === true
    const weight: number = kg as number
    if (weight <= 0) {
      if (confirmed) {
        if (idx >= 0) list.splice(idx, 1)
      } else {
        if (idx >= 0) list[idx] = { driverId, sessionId, kg: 0, confirmed: false }
        else list.push({ driverId, sessionId, kg: 0, confirmed: false })
      }
    } else {
      if (idx >= 0) list[idx] = { driverId, sessionId, kg: weight, confirmed }
      else list.push({ driverId, sessionId, kg: weight, confirmed })
    
    }
    const wr = await writeRedisCollection('ballast', list)
    if (!wr.ok) return NextResponse.json({ error: 'write_failed', detail: wr.error ?? '' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
