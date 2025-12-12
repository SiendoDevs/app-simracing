import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { Redis } from '@upstash/redis'
import { calculateChampionship, applySessionPoints } from '@/lib/calculatePoints'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
import PilotProfileCard from '@/components/PilotProfileCard'
import { currentUser } from '@clerk/nextjs/server'
import { resolveSkinImageFor, resolveSkinNumber } from '@/lib/skins'
import Image from 'next/image'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  const sessions = await loadLocalSessions()
  const fromHeaders = await (async () => { try { const h = await (await import('next/headers')).headers(); const host = h.get('x-forwarded-host') || h.get('host') || ''; const proto = h.get('x-forwarded-proto') || 'https'; return host ? `${proto}://${host}` : null } catch { return null } })()
  const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
    ? `https://${process.env.VERCEL_URL}`
    : undefined
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_BASE_URL
    : undefined
  const origin = fromVercel ?? fromEnv ?? fromHeaders ?? 'http://localhost:3000'
  const publishedRemote = await (async () => {
    try {
      const r1 = await fetch('/api/published', { cache: 'no-store', next: { revalidate: 0 } })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/published`, { cache: 'no-store', next: { revalidate: 0 } })
      if (r2.ok) {
        const j = await r2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
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
      if (url && token) {
        const redis = new Redis({ url, token })
        let curr: unknown = null
        try { curr = await redis.json.get('published') } catch {}
        if (!Array.isArray(curr)) {
          try { const s = await redis.get('published'); if (typeof s === 'string') curr = JSON.parse(s) } catch {}
        }
        if (Array.isArray(curr)) return curr
        if (curr && typeof curr === 'object') return Object.values(curr as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const pubRaw = publishedRemote ?? []
  const pubEntries = Array.isArray(pubRaw) ? pubRaw.filter((x) => x && typeof (x as { sessionId?: unknown }).sessionId === 'string') : []
  const toBool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1'
  const normalizeId = (s: string) => (s.includes(':') ? (s.split(':').pop() as string) : s)
  const canonicalId = (s: string) => {
    const n = normalizeId(s)
    const m = n.match(/^([0-9]{4})_([0-9]{2})_([0-9]{2})_([0-9]{1,2})_([0-9]{1,2})_(.+)$/)
    if (!m) return n
    const [, y, mo, d, h, mi, t] = m
    return `${y}_${mo}_${d}_${h}_${Number(mi)}_${t.toUpperCase()}`
  }
  const published = new Set(pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map((p) => canonicalId((p as { sessionId: string }).sessionId)))
  const sessionsPublished = sessions.filter((s) => published.has(canonicalId(s.id)))
  if (sessionsPublished.length === 0) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold">Perfil de Piloto</h1>
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No hay resultados oficiales publicados aún.</div>
      </div>
    )
  }
  const exclusionsRemote = await (async () => {
    try {
      const res1 = await fetch('/api/exclusions', { cache: 'no-store', next: { revalidate: 0 } })
      if (res1.ok) {
        const j = await res1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const res2 = await fetch(`${origin}/api/exclusions`, { cache: 'no-store', next: { revalidate: 0 } })
      if (res2.ok) {
        const j = await res2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  type Excl = { driverId: string; sessionId: string; exclude: boolean; confirmed?: boolean }
  const isExcl = (x: unknown): x is Excl => {
    if (!x || typeof x !== 'object') return false
    const o = x as { driverId?: unknown; sessionId?: unknown; exclude?: unknown; confirmed?: unknown }
    return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.exclude === 'boolean'
  }
  const exclusions = (exclusionsRemote ?? []).filter(isExcl).filter((e) => e.confirmed === true || e.confirmed == null)
  const penaltiesRemote = await (async () => {
    try {
      const r1 = await fetch('/api/penalties', { cache: 'no-store', next: { revalidate: 0 } })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/penalties`, { cache: 'no-store', next: { revalidate: 0 } })
      if (r2.ok) {
        const j = await r2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  type Pen = { driverId: string; sessionId: string; seconds: number; confirmed?: boolean }
  const isPen = (x: unknown): x is Pen => {
    if (!x || typeof x !== 'object') return false
    const o = x as { driverId?: unknown; sessionId?: unknown; seconds?: unknown; confirmed?: unknown }
    return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.seconds === 'number'
  }
  const penalties = (penaltiesRemote ?? []).filter(isPen)
  const adjusted = sessionsPublished
    .map((s) => applyDnfByLaps(s))
    .map((s) => applyPenaltiesToSession(s, penalties))
    .map((s) => stripExcluded(s, exclusions))
  const pointsRemote = await (async () => {
    try {
      const r1 = await fetch('/api/points', { cache: 'no-store', next: { revalidate: 0 } })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/points`, { cache: 'no-store', next: { revalidate: 0 } })
      if (r2.ok) {
        const j = await r2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  type Pts = { sessionId: string; points: number[]; confirmed?: boolean }
  const isPts = (x: unknown): x is Pts => {
    if (!x || typeof x !== 'object') return false
    const o = x as { sessionId?: unknown; points?: unknown; confirmed?: unknown }
    return typeof o.sessionId === 'string' && Array.isArray(o.points)
  }
  const pointsMap = new Map<string, number[]>()
  for (const it of (pointsRemote ?? [])) {
    if (isPts(it) && (it.confirmed === true || it.confirmed == null)) {
      pointsMap.set((it as Pts).sessionId, ((it as Pts).points as number[]).filter((n) => Number.isFinite(n) && n >= 0))
    }
  }
  const table = calculateChampionship(adjusted, pointsMap)
  const user = await currentUser().catch(() => null)
  const pm = (user?.publicMetadata || {}) as Record<string, unknown>
  const um = (user?.unsafeMetadata || {}) as Record<string, unknown>
  const steamId = (() => {
    const raw = (um['steamId'] ?? pm['steamId'])
    return typeof raw === 'string' ? raw.trim() : ''
  })()
  const me = steamId ? table.find((d) => (d.driverId || '').trim() === steamId) : undefined
  const previewUrl = me ? resolveSkinImageFor(me.livery, me.name) : undefined
  const numberToken = me ? resolveSkinNumber(me.livery, me.name) : undefined
  const sessionsWithPoints = adjusted.map((s) => applySessionPoints(s, pointsMap.get(s.id)))
  const myPointEntries = (() => {
    const list: Array<{ label: string; acc: number; pts: number }> = []
    const sorted = sessionsWithPoints.slice().sort((a, b) => a.id.localeCompare(b.id))
    let acc = 0
    for (const s of sorted) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      const pts = typeof r?.points === 'number' ? (r!.points as number) : 0
      acc += pts
      const label = s.date ? (() => { try { const d = new Date(s.date as string); return d.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) } catch { return s.id.slice(0, 10).replace(/_/g, '-') } })() : s.id.slice(0, 10).replace(/_/g, '-')
      list.push({ label, acc, pts })
    }
    return list
  })()
  const PointsProgressChart = (await import('@/components/PointsProgressChart')).default
  return (
    <div className="py-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <PilotProfileCard data={table} sessions={adjusted} numberToken={numberToken} />
        <div className="flex flex-col gap-4 h-full min-h-0">
          <div className="rounded-md border p-4 flex items-center justify-center">
            {previewUrl ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden">
                <Image src={previewUrl} alt={`Livery de ${me?.name ?? 'piloto'}`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sin preview</div>
            )}
          </div>
          <div className="rounded-md border p-4 flex-1 min-h-0 flex flex-col">
            <div className="text-sm font-medium">Progreso de puntos</div>
            <div className="mt-2 flex-1 min-h-0">
              <PointsProgressChart data={myPointEntries} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
