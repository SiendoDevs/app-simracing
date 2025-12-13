import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { currentUser } from '@clerk/nextjs/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'

export const runtime = 'nodejs'

function getRedisClient(): Redis | null {
  try {
    const url =
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.UPSTASH_REDIS_REST_REDIS_URL ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_KV_URL ||
      process.env.UPSTASH_REDIS_URL ||
      ''
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN ||
      process.env.UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN ||
      process.env.UPSTASH_REDIS_TOKEN ||
      ''
    if (url && token) return new Redis({ url, token })
    try {
      return Redis.fromEnv()
    } catch {
      return null
    }
  } catch {
    return null
  }
}

type VoteBody = {
  driverId?: string
}

export async function GET() {
  try {
    const redis = getRedisClient()
    if (!redis) return NextResponse.json({ error: 'redis_unavailable' }, { status: 500 })
    let votes: Record<string, number> = {}
    try {
      const j = await redis.json.get('skin_votes')
      if (j && typeof j === 'object') {
        const obj = j as Record<string, unknown>
        const counts = obj['counts']
        if (counts && typeof counts === 'object') {
          votes = counts as Record<string, number>
        } else {
          votes = obj as Record<string, number>
        }
      } else {
        const s = await redis.get('skin_votes')
        if (typeof s === 'string') {
          const parsed = JSON.parse(s) as Record<string, unknown>
          const counts = (parsed as Record<string, unknown>)['counts']
          votes = counts && typeof counts === 'object' ? (counts as Record<string, number>) : (parsed as Record<string, number>)
        }
      }
    } catch {}
    return NextResponse.json(votes)
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser().catch(() => null)
    if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const body = (await req.json().catch(() => ({}))) as VoteBody
    const driverId = typeof body?.driverId === 'string' ? body.driverId.trim() : ''
    if (!driverId) return NextResponse.json({ error: 'invalid_driver' }, { status: 400 })

    // Validate driverId exists in championship table
    const sessions = await loadLocalSessions()
    const adjusted = sessions.map((s) => applyDnfByLaps(s)).map((s) => applyPenaltiesToSession(s, [])).map((s) => stripExcluded(s, []))
    const table = calculateChampionship(adjusted)
    const known = new Set(table.map((r) => (r.driverId || '').trim()))
    if (!known.has(driverId)) return NextResponse.json({ error: 'unknown_driver' }, { status: 404 })

    const redis = getRedisClient()
    if (!redis) return NextResponse.json({ error: 'redis_unavailable' }, { status: 500 })
    let doc: { counts: Record<string, number>; users: Record<string, string> } = { counts: {}, users: {} }
    try {
      const j = await redis.json.get('skin_votes')
      if (j && typeof j === 'object') {
        const obj = j as Record<string, unknown>
        const counts = obj['counts']
        const users = obj['users']
        doc = {
          counts: (counts && typeof counts === 'object') ? (counts as Record<string, number>) : (obj as Record<string, number>),
          users: (users && typeof users === 'object') ? (users as Record<string, string>) : {}
        }
      } else {
        const s = await redis.get('skin_votes')
        if (typeof s === 'string') {
          const parsed = JSON.parse(s) as Record<string, unknown>
          const counts = parsed['counts']
          const users = parsed['users']
          doc = {
            counts: (counts && typeof counts === 'object') ? (counts as Record<string, number>) : (parsed as Record<string, number>),
            users: (users && typeof users === 'object') ? (users as Record<string, string>) : {}
          }
        }
      }
    } catch {}
    const prevSel = doc.users[user.id]
    if (prevSel && prevSel.length > 0) {
      return NextResponse.json({ error: 'already_voted', selection: prevSel }, { status: 409 })
    }
    doc.counts[driverId] = Math.max(0, Math.floor(doc.counts[driverId] ?? 0)) + 1
    doc.users[user.id] = driverId
    // Persist
    try {
      await redis.json.set('skin_votes', '$', doc as unknown as Record<string, unknown>)
    } catch {
      await redis.set('skin_votes', JSON.stringify(doc))
    }
    return NextResponse.json({ ok: true, votes: doc.counts })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
