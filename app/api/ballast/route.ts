import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { Redis } from '@upstash/redis'
import { loadBallast } from '@/lib/ballast'

export const runtime = 'nodejs'

function kvConfigured() {
  return !!(process.env.KV_URL && process.env.KV_REST_TOKEN)
}

function upstashConfigured() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
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
      const redis = Redis.fromEnv()
      const data = await redis.get('ballast')
      if (Array.isArray(data)) return NextResponse.json(data)
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
    if (!adminToken || adminToken.length === 0 || adminToken !== headerToken) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json().catch(() => null) as { driverId?: string; sessionId?: string; kg?: number } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const { driverId, sessionId, kg } = body
    if (!driverId || !sessionId || typeof kg !== 'number') return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    let list: Array<{ driverId: string; sessionId: string; kg: number }>
    if (kvConfigured()) {
      const curr = await kv.get('ballast')
      list = Array.isArray(curr) ? (curr as Array<{ driverId: string; sessionId: string; kg: number }>) : []
    } else {
      const redis = Redis.fromEnv()
      const curr = await redis.get('ballast')
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
      const redis = Redis.fromEnv()
      await redis.set('ballast', list)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
