import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
import { currentChampionship } from '@/data/championships'
import { createRedis, upstashConfigured } from '@/lib/redis'

export const runtime = 'nodejs'

type VoteBody = {
  driverId?: string
}

async function migrateIfNeeded(redis: ReturnType<typeof createRedis>) {
  const migratedKey = `skin_votes_migrated:${currentChampionship.id}`
  const migrated = await redis.get(migratedKey).catch(() => null)
  if (migrated) return

  const lockKey = `skin_votes_migrate_lock:${currentChampionship.id}`
  const lockOk = await redis.setnx(lockKey, String(Date.now())).catch(() => 0)
  if (lockOk !== 1) return

  const oldKey = `skin_votes:${currentChampionship.id}`
  const countsKey = `skin_votes_counts:${currentChampionship.id}`
  const userPrefix = `skin_vote_user:${currentChampionship.id}:`

  let doc: { counts: Record<string, number>; users: Record<string, string> } | null = null
  try {
    const j = await redis.json.get(oldKey)
    if (j && typeof j === 'object') {
      const obj = j as Record<string, unknown>
      const counts = obj['counts']
      const users = obj['users']
      doc = {
        counts: (counts && typeof counts === 'object') ? (counts as Record<string, number>) : (obj as Record<string, number>),
        users: (users && typeof users === 'object') ? (users as Record<string, string>) : {}
      }
    } else {
      const s = await redis.get(oldKey)
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

  if (doc) {
    const existingCounts = await redis.hgetall<Record<string, unknown>>(countsKey).catch(() => null)
    const hasCounts = !!existingCounts && Object.keys(existingCounts).length > 0
    if (!hasCounts) {
      const kv: Record<string, number> = {}
      for (const [k, v] of Object.entries(doc.counts ?? {})) {
        const n = Math.max(0, Math.floor(Number(v ?? 0)))
        if (k && n > 0) kv[k] = n
      }
      if (Object.keys(kv).length > 0) {
        await redis.hset(countsKey, kv).catch(() => null)
      }
    }

    for (const [uid, sel] of Object.entries(doc.users ?? {})) {
      if (!uid || !sel) continue
      await redis.setnx(`${userPrefix}${uid}`, sel).catch(() => 0)
    }
  }

  await redis.set(migratedKey, '1').catch(() => null)
}

async function readLegacySelection(redis: ReturnType<typeof createRedis>, userId: string) {
  const oldKey = `skin_votes:${currentChampionship.id}`
  try {
    const j = await redis.json.get(oldKey)
    if (j && typeof j === 'object') {
      const obj = j as Record<string, unknown>
      const users = obj['users']
      if (users && typeof users === 'object') {
        const m = users as Record<string, string>
        return m[userId] ?? null
      }
      return null
    }
    const s = await redis.get(oldKey)
    if (typeof s === 'string') {
      const parsed = JSON.parse(s) as Record<string, unknown>
      const users = parsed['users']
      if (users && typeof users === 'object') {
        const m = users as Record<string, string>
        return m[userId] ?? null
      }
    }
  } catch {}
  return null
}

export async function GET() {
  try {
    const redis = createRedis()
    await migrateIfNeeded(redis)
    const countsKey = `skin_votes_counts:${currentChampionship.id}`
    const raw = await redis.hgetall<Record<string, unknown>>(countsKey).catch(() => null)
    const votes: Record<string, number> = {}
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        const n = Math.max(0, Math.floor(Number(v ?? 0)))
        votes[k] = n
      }
    }
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
    const sessionDateKey = (s: { id: string; date?: string }) => {
      if (typeof s.date === 'string') {
        const d = new Date(s.date)
        if (!isNaN(d.getTime())) {
          const yy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return `${yy}-${mm}-${dd}`
        }
      }
      const m = s.id.match(/^(\d{4})_(\d{2})_(\d{2})/)
      if (m) return `${m[1]}-${m[2]}-${m[3]}`
      return 'Sin-fecha'
    }
    const sessionsInRange = sessions.filter((s) => {
      const k = sessionDateKey(s)
      if (k === 'Sin-fecha') return false
      if (k < currentChampionship.startDate) return false
      if (currentChampionship.endDate && k > currentChampionship.endDate) return false
      return true
    })
    const adjusted = sessionsInRange
      .map((s) => applyDnfByLaps(s))
      .map((s) => applyPenaltiesToSession(s, []))
      .map((s) => stripExcluded(s, []))
    const table = calculateChampionship(adjusted)
    const known = new Set(table.map((r) => (r.driverId || '').trim()))
    if (!known.has(driverId)) return NextResponse.json({ error: 'unknown_driver' }, { status: 404 })

    if (!upstashConfigured()) {
      return NextResponse.json({
        error: 'redis_unavailable',
        detail: 'No se pudo conectar a Upstash Redis',
        required_env_vars: [
          'UPSTASH_REDIS_REST_URL',
          'UPSTASH_REDIS_REST_REDIS_URL',
          'UPSTASH_REDIS_REST_KV_REST_API_URL',
          'UPSTASH_REDIS_REST_KV_URL',
          'UPSTASH_REDIS_URL',
          'UPSTASH_REDIS_REST_TOKEN',
          'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
          'UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN',
          'UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN',
          'UPSTASH_REDIS_TOKEN'
        ]
      }, { status: 500 })
    }
    const redis = createRedis()
    await migrateIfNeeded(redis)
    const countsKey = `skin_votes_counts:${currentChampionship.id}`
    const userKey = `skin_vote_user:${currentChampionship.id}:${user.id}`
    const migrated = await redis.get(`skin_votes_migrated:${currentChampionship.id}`).catch(() => null)
    if (!migrated) {
      const legacySel = await readLegacySelection(redis, user.id)
      if (typeof legacySel === 'string' && legacySel.length > 0) {
        return NextResponse.json({ error: 'already_voted', selection: legacySel }, { status: 409 })
      }
    }

    const prev = await redis.get<string>(userKey).catch(() => null)
    if (typeof prev === 'string' && prev.length > 0) {
      return NextResponse.json({ error: 'already_voted', selection: prev }, { status: 409 })
    }

    const script = `
local userKey = KEYS[1]
local countsKey = KEYS[2]
local driverId = ARGV[1]
if redis.call('EXISTS', userKey) == 1 then
  return {0, redis.call('GET', userKey)}
end
redis.call('SET', userKey, driverId)
local newCount = redis.call('HINCRBY', countsKey, driverId, 1)
return {1, newCount}
`.trim()
    const result = await redis.eval<[string], [number, unknown]>(script, [userKey, countsKey], [driverId]).catch(() => null)
    if (!result || !Array.isArray(result) || result.length < 1) {
      return NextResponse.json({ error: 'server_error', detail: 'vote_script_failed' }, { status: 500 })
    }
    const okFlag = Number(result[0] ?? 0)
    if (okFlag !== 1) {
      const sel = typeof result[1] === 'string' ? (result[1] as string) : null
      return NextResponse.json({ error: 'already_voted', selection: sel }, { status: 409 })
    }

    const raw = await redis.hgetall<Record<string, unknown>>(countsKey).catch(() => null)
    const votes: Record<string, number> = {}
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        votes[k] = Math.max(0, Math.floor(Number(v ?? 0)))
      }
    }
    return NextResponse.json({ ok: true, votes })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
