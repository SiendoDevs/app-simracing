import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { loadPenalties } from '@/lib/penalties'

export const runtime = 'nodejs'

function kvConfigured() {
  return !!(process.env.KV_URL && process.env.KV_REST_TOKEN)
}

export async function GET() {
  try {
    if (!kvConfigured()) {
      return NextResponse.json(loadPenalties())
    }
    const data = await kv.get('penalties')
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
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; seconds?: number } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, seconds } = body
    if (!driverId || !sessionId || typeof seconds !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    const curr = await kv.get('penalties')
    const list: Array<{ driverId: string; sessionId: string; seconds: number }> = Array.isArray(curr)
      ? (curr as Array<{ driverId: string; sessionId: string; seconds: number }>)
      : []
    const idx = list.findIndex((x) => x.driverId === driverId && x.sessionId === sessionId)
    if (seconds <= 0) {
      if (idx >= 0) list.splice(idx, 1)
    } else {
      if (idx >= 0) list[idx] = { driverId, sessionId, seconds }
      else list.push({ driverId, sessionId, seconds })
    }
    await kv.set('penalties', list)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
