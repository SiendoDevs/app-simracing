import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import DriversTable from '@/components/DriversTable'
import DriverCompare from '@/components/DriverCompare'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
 

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
  try { console.log('[drivers/page] origin', origin, { fromVercel: !!fromVercel, fromEnv: !!fromEnv, fromHeaders: !!fromHeaders }) } catch {}
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
  try { console.log('[drivers/page] published entries', Array.isArray(pubRaw) ? pubRaw.length : (pubRaw ? Object.keys(pubRaw as Record<string, unknown>).length : 0)) } catch {}
  try { console.log('[drivers/page] published sample', pubEntries.slice(0, 3)) } catch {}
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
  try { console.log('[drivers/page] sessionsPublished count', sessionsPublished.length, sessionsPublished.slice(0, 3).map((s) => s.id)) } catch {}
  try { console.log('[drivers/page] publishedSet values', Array.from(published).slice(0, 5)) } catch {}
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
  console.log('[drivers/page] exclusions count', Array.isArray(exclusionsRemote) ? exclusionsRemote.length : (exclusionsRemote ? Object.keys(exclusionsRemote as Record<string, unknown>).length : 0))
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
  try {
    const qual = adjusted.filter((s) => s.type.toUpperCase() === 'QUALIFY')
    const sample = qual.slice(0, 2).map((s) => ({ id: s.id, top: s.results.slice(0, 3).map((r) => ({ driverId: r.driverId, pos: r.position })) }))
    console.log('[drivers/page] sample qual sessions', sample)
  } catch {}
  if (sessionsPublished.length === 0) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold">Pilotos</h1>
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No hay resultados oficiales publicados aún.</div>
      </div>
    )
  }
  const table = calculateChampionship(adjusted)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Pilotos</h1>
      <DriversTable data={table} />
      <DriverCompare />
    </div>
  )
}
