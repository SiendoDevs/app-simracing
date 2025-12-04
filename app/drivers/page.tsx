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
  const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
    ? `https://${process.env.VERCEL_URL}`
    : undefined
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_BASE_URL
    : undefined
  const origin = fromVercel ?? fromEnv ?? 'http://localhost:3000'
  const publishedRemote = await (async () => {
    try {
      const r1 = await fetch('/api/published', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/published`, { cache: 'no-store' })
      if (r2.ok) {
        const j = await r2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const pubRaw = publishedRemote ?? []
  const pubEntries = Array.isArray(pubRaw) ? pubRaw.filter((x) => x && typeof (x as { sessionId?: unknown }).sessionId === 'string') : []
  const toBool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1'
  const hasPublishConfig = pubEntries.length > 0
  const published = new Set(pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map((p) => (p as { sessionId: string }).sessionId))
  const sessionsPublished = hasPublishConfig ? sessions.filter((s) => published.has(s.id)) : sessions
  const exclusionsRemote = await (async () => {
    try {
      const res1 = await fetch('/api/exclusions', { cache: 'no-store' })
      if (res1.ok) {
        const j = await res1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const res2 = await fetch(`${origin}/api/exclusions`, { cache: 'no-store' })
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
      const r1 = await fetch('/api/penalties', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/penalties`, { cache: 'no-store' })
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
  const table = calculateChampionship(adjusted)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Pilotos</h1>
      <DriversTable data={table} />
      <DriverCompare />
    </div>
  )
}
