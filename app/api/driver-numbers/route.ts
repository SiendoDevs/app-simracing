import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { currentUser } from '@clerk/nextjs/server'

export const runtime = 'nodejs'

type DriverNumberEntry = { steamId: string; number: string; name: string }
type DriverNumberDoc = { bySteamId: Record<string, DriverNumberEntry>; byNumber: Record<string, DriverNumberEntry> }

function resolveUpstashEnv() {
  const candidates = [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_REDIS_URL,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_KV_URL,
    process.env.UPSTASH_REDIS_URL,
  ].filter(Boolean) as string[]
  const url = candidates.find((u) => typeof u === 'string' && u.startsWith('https://')) || ''
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READONLY_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN ||
    ''
  )
  return { url, token }
}

function createRedis() {
  const { url, token } = resolveUpstashEnv()
  if (url && token) return new Redis({ url, token })
  return Redis.fromEnv()
}

function normalizeDoc(raw: unknown): DriverNumberDoc {
  const empty: DriverNumberDoc = { bySteamId: {}, byNumber: {} }
  if (!raw || typeof raw !== 'object') return empty
  const obj = raw as Record<string, unknown> & { bySteamId?: unknown; byNumber?: unknown }
  const bySteamId: Record<string, DriverNumberEntry> = {}
  const byNumber: Record<string, DriverNumberEntry> = {}

  if (obj.bySteamId && typeof obj.bySteamId === 'object') {
    const bs = obj.bySteamId as Record<string, unknown>
    for (const [sid, value] of Object.entries(bs)) {
      if (!value || typeof value !== 'object') continue
      const v = value as { steamId?: unknown; number?: unknown; name?: unknown }
      const num = v.number != null ? String(v.number) : ''
      if (!num) continue
      const s = typeof v.steamId === 'string' && v.steamId.length > 0 ? v.steamId : sid
      const name = typeof v.name === 'string' ? v.name : ''
      const entry: DriverNumberEntry = { steamId: s, number: num, name }
      bySteamId[s] = entry
      if (!byNumber[num]) byNumber[num] = entry
    }
  }

  if (obj.byNumber && typeof obj.byNumber === 'object') {
    const bn = obj.byNumber as Record<string, unknown>
    for (const [numKey, value] of Object.entries(bn)) {
      if (!value || typeof value !== 'object') continue
      const v = value as { steamId?: unknown; number?: unknown; name?: unknown }
      const num = v.number != null ? String(v.number) : String(numKey)
      const s = typeof v.steamId === 'string' ? v.steamId : ''
      if (!s || !num) continue
      const name = typeof v.name === 'string' ? v.name : ''
      const existing = bySteamId[s]
      const entry: DriverNumberEntry = existing ?? { steamId: s, number: num, name }
      bySteamId[s] = entry
      byNumber[num] = entry
    }
  }

  if (Object.keys(bySteamId).length === 0 && Object.keys(byNumber).length === 0) {
    const legacy = obj as Record<string, unknown>
    for (const [sid, numVal] of Object.entries(legacy)) {
      const num = numVal != null ? String(numVal) : ''
      if (!num) continue
      const entry: DriverNumberEntry = { steamId: sid, number: num, name: '' }
      bySteamId[sid] = entry
      if (!byNumber[num]) byNumber[num] = entry
    }
  }

  return { bySteamId, byNumber }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const steamId = searchParams.get('steamId')

    const redis = createRedis()
    let raw: unknown = null

    try {
      const j = await redis.json.get('driver_numbers')
      if (j) raw = j
      if (!raw) {
        const s = await redis.get('driver_numbers')
        if (typeof s === 'string') raw = JSON.parse(s) as unknown
      }
    } catch {}

    const doc = normalizeDoc(raw)

    if (steamId) {
      const entry = doc.bySteamId[steamId]
      return NextResponse.json({
        number: entry?.number ?? null,
        name: entry?.name ?? null,
      })
    }

    const legacy: Record<string, string> = {}
    for (const [sid, entry] of Object.entries(doc.bySteamId)) {
      legacy[sid] = entry.number
    }
    return NextResponse.json(legacy)
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const pm = (user.publicMetadata || {}) as Record<string, unknown>
    const um = (user.unsafeMetadata || {}) as Record<string, unknown>
    const steamId = (um['steamId'] ?? pm['steamId']) as string

    if (!steamId) {
      return NextResponse.json({ error: 'no_steamid_linked' }, { status: 400 })
    }

    const body = await request.json()
    const { number } = body

    if (!number) {
       return NextResponse.json({ error: 'missing_number' }, { status: 400 })
    }

    const num = parseInt(String(number), 10)
    if (isNaN(num) || num < 1 || num > 99) {
      return NextResponse.json({ error: 'invalid_number' }, { status: 400 })
    }

    const redis = createRedis()
    let raw: unknown = null

    try {
      const j = await redis.json.get('driver_numbers')
      if (j) raw = j
      if (!raw) {
        const s = await redis.get('driver_numbers')
        if (typeof s === 'string') raw = JSON.parse(s) as unknown
      }
    } catch {}

    const doc = normalizeDoc(raw)

    // Limpieza: asegurar que cada piloto tenga solo un número activo
    for (const [numKey, value] of Object.entries(doc.byNumber)) {
      const entry = value as DriverNumberEntry
      const fromSteam = doc.bySteamId[entry.steamId]
      if (!fromSteam || fromSteam.number !== entry.number) {
        delete doc.byNumber[numKey]
      }
    }
    const numKey = String(num)
    const existing = doc.byNumber[numKey]
    if (existing && existing.steamId !== steamId) {
      return NextResponse.json(
        {
          error: 'number_taken',
          number: existing.number,
          steamId: existing.steamId,
          name: existing.name,
        },
        { status: 409 },
      )
    }

    let pilotName = ''
    if (typeof user.fullName === 'string' && user.fullName.trim().length > 0) {
      pilotName = user.fullName.trim()
    } else if (user.firstName || user.lastName) {
      pilotName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    } else if (user.username) {
      pilotName = user.username
    } else if (user.primaryEmailAddress?.emailAddress) {
      pilotName = user.primaryEmailAddress.emailAddress
    }

    const entry: DriverNumberEntry = {
      steamId,
      number: String(num),
      name: pilotName,
    }

    // Actualizar mapping por piloto
    doc.bySteamId[steamId] = entry

    // Eliminar cualquier número viejo que tuviera este piloto
    for (const [n, value] of Object.entries(doc.byNumber)) {
      const e = value as DriverNumberEntry
      if (e.steamId === steamId && n !== entry.number) {
        delete doc.byNumber[n]
      }
    }
    // Registrar el número nuevo
    doc.byNumber[entry.number] = entry

    try {
      await redis.json.set('driver_numbers', '$', doc as unknown as Record<string, unknown>)
    } catch {
      await redis.set('driver_numbers', JSON.stringify(doc))
    }

    return NextResponse.json({ ok: true, number: String(num) })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
