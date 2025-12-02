import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { loadBallast } from '@/lib/ballast'

export const runtime = 'nodejs'

function kvConfigured() {
  return !!(process.env.KV_URL && process.env.KV_REST_TOKEN)
}

export async function GET() {
  try {
    if (!kvConfigured()) {
      return NextResponse.json(loadBallast())
    }
    const data = await kv.get('ballast')
    if (Array.isArray(data)) return NextResponse.json(data)
    return NextResponse.json([])
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!kvConfigured()) return NextResponse.json({ error: 'kv_not_configured' }, { status: 500 })
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    if (!adminToken || adminToken.length === 0 || adminToken !== headerToken) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; kg?: number } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, kg } = body
    if (!driverId || !sessionId || typeof kg !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    const curr = await kv.get('ballast')
    const list: Array<{ driverId: string; sessionId: string; kg: number }> = Array.isArray(curr)
      ? (curr as Array<{ driverId: string; sessionId: string; kg: number }>)
      : []
    const idx = list.findIndex((x) => x.driverId === driverId && x.sessionId === sessionId)
    if (kg <= 0) {
      if (idx >= 0) list.splice(idx, 1)
    } else {
      if (idx >= 0) list[idx] = { driverId, sessionId, kg }
      else list.push({ driverId, sessionId, kg })
    }
    await kv.set('ballast', list)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
