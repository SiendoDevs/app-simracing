import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import ChampionshipBallast from '@/components/ChampionshipBallast'
import ExportChampionshipButton from '@/components/ExportChampionshipButton'
import { Progress } from '@/components/ui/progress'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession, loadPenalties } from '@/lib/penalties'
import { Redis } from '@upstash/redis'
import TopThreeChampionship from '@/components/TopThreeChampionship'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Palette } from 'lucide-react'

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
  try { console.log('[championship/page] origin', origin, { fromVercel: !!fromVercel, fromEnv: !!fromEnv, fromHeaders: !!fromHeaders }) } catch {}
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
  try { console.log('[championship/page] published entries', Array.isArray(pubRaw) ? pubRaw.length : (pubRaw ? Object.keys(pubRaw as Record<string, unknown>).length : 0)) } catch {}
  try { console.log('[championship/page] published sample', pubEntries.slice(0, 3)) } catch {}
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
  try { console.log('[championship/page] sessionsPublished count', sessionsPublished.length, sessionsPublished.slice(0, 3).map((s) => s.id)) } catch {}
  try { console.log('[championship/page] publishedSet values', Array.from(published).slice(0, 5)) } catch {}
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
  console.log('[championship/page] exclusions count', Array.isArray(exclusionsRemote) ? exclusionsRemote.length : (exclusionsRemote ? Object.keys(exclusionsRemote as Record<string, unknown>).length : 0))
  const penaltiesRemote = await (async () => {
    try {
      const res = await fetch('/api/penalties', { cache: 'no-store', next: { revalidate: 0 } })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const res2 = await fetch(`${origin}/api/penalties`, { cache: 'no-store', next: { revalidate: 0 } })
      if (res2.ok) {
        const j = await res2.json()
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
  const penaltiesLocal = (() => {
    try { return loadPenalties() } catch { return [] }
  })()
  const penalties = ([...(penaltiesRemote ?? []), ...penaltiesLocal]).filter(isPen)
  const adjusted = sessionsPublished
    .map((s) => applyDnfByLaps(s))
    .map((s) => applyPenaltiesToSession(s, penalties))
    .map((s) => stripExcluded(s, exclusions))
  try {
    const qual = adjusted.filter((s) => s.type.toUpperCase() === 'QUALIFY')
    const sample = qual.slice(0, 2).map((s) => ({ id: s.id, top: s.results.slice(0, 3).map((r) => ({ driverId: r.driverId, pos: r.position })) }))
    console.log('[championship/page] sample qual sessions', sample)
  } catch {}
  if (sessionsPublished.length === 0) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold">Campeonato</h1>
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No hay resultados oficiales publicados aún.</div>
      </div>
    )
  }
  const pointsRemote = await (async () => {
    try {
      const r1 = await fetch('/api/points', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/points`, { cache: 'no-store' })
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
  const manualRemote = await (async () => {
    try {
      // intento 1: ruta interna
      const r1 = await fetch('/api/ballast', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j as Array<{ driverId: string; sessionId: string; kg: number }>
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>) as Array<{ driverId: string; sessionId: string; kg: number }>
      }
      // intento 2: origen absoluto (útil en ciertos entornos dev)
      if (origin) {
        const r2 = await fetch(`${origin}/api/ballast`, { cache: 'no-store' })
          if (r2.ok) {
            const j = await r2.json()
            if (Array.isArray(j)) return j as Array<{ driverId: string; sessionId: string; kg: number }>
            if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>) as Array<{ driverId: string; sessionId: string; kg: number }>
          }
        }
      // intento 3: leer directo de Redis SDK
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
        try { curr = await redis.json.get('ballast') } catch {}
        if (!Array.isArray(curr) && (!curr || typeof curr !== 'object')) {
          try {
            const s = await redis.get('ballast')
            if (typeof s === 'string') curr = JSON.parse(s)
          } catch {}
        }
        const isValid = (x: unknown): x is { driverId: string; sessionId: string; kg: number } => {
          if (!x || typeof x !== 'object') return false
          const obj = x as Record<string, unknown>
          return (typeof obj.driverId === 'string' && typeof obj.sessionId === 'string' && typeof obj.kg === 'number')
        }
        if (Array.isArray(curr)) return (curr as unknown[]).filter(isValid) as Array<{ driverId: string; sessionId: string; kg: number }>
        if (curr && typeof curr === 'object') return Object.values(curr as Record<string, unknown>).filter(isValid) as Array<{ driverId: string; sessionId: string; kg: number }>
      }
    } catch {}
    return null
  })()
  const manual = manualRemote ?? []
  try { console.log('[championship/page] ballast manual count', manual.length, manual.slice(0, 3)) } catch {}
  const relevant = sessionsPublished.filter((s) => {
    const t = s.type.toUpperCase()
    return t === 'RACE' || t === 'QUALIFY'
  })
  const plannedCounts = [3, 3, 3, 2, 3, 3, 2, 2]
  const totalFechas = plannedCounts.length
  let remaining = relevant.length
  let fechasCompletas = 0
  let parcial = 0
  for (let i = 0; i < plannedCounts.length; i++) {
    const need = plannedCounts[i]
    if (remaining >= need) {
      fechasCompletas++
      remaining -= need
    } else {
      parcial = need > 0 ? remaining / need : 0
      break
    }
  }
  const progressValue = Math.round(((fechasCompletas + parcial) / totalFechas) * 100)
  return (
    <div className="py-6 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campeonato</h1>
        <div className="text-sm">
          <Button
            asChild
            className="bg-linear-to-r from-[#e6c463] via-[#d8552b] to-[#b9902e] text-white hover:brightness-110 hover:scale-[1.02] transition-all shadow-sm hover:shadow-md"
          >
            <Link href="/skins-vote">
              <Palette className="size-4" />
              Votar Mejor Livery
            </Link>
          </Button>
        </div>
      </div>
      <TopThreeChampionship data={table} />
      <div className="space-y-4">
        <Progress value={progressValue} />
        <div className="text-xs text-muted-foreground">{fechasCompletas}/{totalFechas} fechas</div>
      </div>
      <div className="space-y-4">
        <ChampionshipBallast data={table} />
        <div className="flex items-center justify-end">
          <ExportChampionshipButton data={table} />
        </div>
      </div>
    </div>
  )
}
