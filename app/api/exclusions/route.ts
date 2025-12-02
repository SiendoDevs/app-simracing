import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { loadExclusions } from '@/lib/exclusions'
import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

function upstashConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export async function GET() {
  try {
    if (upstashConfigured()) {
      const redis = Redis.fromEnv()
      const data = await redis.json.get('exclusions')
      if (Array.isArray(data)) return NextResponse.json(data)
      return NextResponse.json([])
    }
  } catch {}
  const data = loadExclusions()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = !!user && (
      (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
      user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
    )
    if (!isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json()
    if (!body || typeof body.driverId !== 'string' || typeof body.sessionId !== 'string') {
      return NextResponse.json({ error: 'driverId y sessionId requeridos' }, { status: 400 })
    }
    const exclude = !!body.exclude
    if (upstashConfigured()) {
      try {
        const redis = Redis.fromEnv()
        const curr = await redis.json.get('exclusions')
        const list = Array.isArray(curr) ? (curr as Array<{ driverId: string; sessionId: string; exclude: boolean }>) : []
        const idx = list.findIndex((x) => x.driverId === body.driverId && x.sessionId === body.sessionId)
        if (idx >= 0) list[idx] = { driverId: body.driverId, sessionId: body.sessionId, exclude }
        else list.push({ driverId: body.driverId, sessionId: body.sessionId, exclude })
        await redis.json.set('exclusions', '$', list)
        return NextResponse.json({ ok: true })
      } catch (e) {
        return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
      }
    }
    // Fallback a archivo local
    try {
      const { saveExclusion } = await import('@/lib/exclusions')
      saveExclusion({ driverId: body.driverId, sessionId: body.sessionId, exclude })
    } catch {}
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
