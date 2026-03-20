import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import ChampionshipBallast from '@/components/ChampionshipBallast'
import ExportChampionshipButton from '@/components/ExportChampionshipButton'
import { Progress } from '@/components/ui/progress'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession, loadPenalties } from '@/lib/penalties'
import TopThreeChampionship from '@/components/TopThreeChampionship'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Palette } from 'lucide-react'
import { championships, currentChampionship } from '@/data/championships'
import { readRedisItems, upstashConfigured } from '@/lib/redis'

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
      if (!upstashConfigured()) return null
      const items = await readRedisItems('published')
      return items
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
  const sessionsInChampionshipRange = sessions.filter((s) => {
    const key = sessionDateKey(s)
    if (key === 'Sin-fecha') return false
    if (key < currentChampionship.startDate) return false
    if (currentChampionship.endDate && key > currentChampionship.endDate) return false
    const t = s.type.toUpperCase()
    return t === 'RACE' || t === 'QUALIFY'
  })
  const ballastSessionIds = sessionsInChampionshipRange.map((s) => s.id)
  const published = new Set(pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map((p) => canonicalId((p as { sessionId: string }).sessionId)))
  const sessionsPublished = sessions
    .filter((s) => published.has(canonicalId(s.id)))
    .filter((s) => {
      const key = sessionDateKey(s)
      if (key === 'Sin-fecha') return false
      if (key < currentChampionship.startDate) return false
      if (currentChampionship.endDate && key > currentChampionship.endDate) return false
      return true
    })
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
  if (sessionsPublished.length === 0) {
    return (
      <div className="py-6 space-y-4">
        <h1 className="text-2xl font-bold">Campeonato</h1>
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No hay resultados oficiales publicados aún.</div>
      </div>
    )
  }
  const pointsRemote = await (async () => {
    // Intento 1: Leer directo de Redis (Prioridad en Server Component)
    try {
      if (upstashConfigured()) {
        const items = await readRedisItems('points')
        if (items.length > 0) return items
      }
    } catch {}

    // Intento 2: API interna
    try {
      const r1 = await fetch('/api/points', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}

    // Intento 3: API absoluta
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
  const relevant = sessionsPublished.filter((s) => {
    const t = s.type.toUpperCase()
    return t === 'RACE' || t === 'QUALIFY'
  })
  const scheduleAll = currentChampionship.schedule
  const plannedCountsAll = currentChampionship.plannedCounts
  const officialIndices = scheduleAll
    .map((ev, i) => ({ ev, i }))
    .filter(({ ev, i }) => ev.official !== false && (plannedCountsAll[i] ?? 0) > 0)
  const totalFechas = officialIndices.length
  const byDate = new Map<string, typeof relevant>()
  for (const s of relevant) {
    const k = sessionDateKey(s)
    const arr = byDate.get(k) ?? []
    arr.push(s)
    byDate.set(k, arr)
  }
  const sortedKeys = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b))
  let fechasCompletas = 0
  let parcial = 0
  let datePtr = 0
  for (let j = 0; j < officialIndices.length; j++) {
    const i = officialIndices[j].i
    const dateKey = sortedKeys[datePtr]
    const list = typeof dateKey === 'string' ? (byDate.get(dateKey) ?? []) : []
    const need = plannedCountsAll[i] ?? 0
    if (need > 0 && list.length >= need) {
      fechasCompletas++
      datePtr++
    } else {
      parcial = need > 0 ? list.length / need : 0
      break
    }
  }
  const progressValue = totalFechas > 0 ? Math.round(((fechasCompletas + parcial) / totalFechas) * 100) : 0
  const season2 = championships.find((c) => c.id === 'season-2')
  const season2Title = season2?.title ?? 'Temporada 2'
  return (
    <div className="py-6 space-y-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">{currentChampionship.title}</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2 text-sm">
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/championship/season-2">{`Ver ${season2Title}`}</Link>
          </Button>
          <Button
            asChild
            className="w-full sm:w-auto bg-linear-to-r from-[#e6c463] via-[#d8552b] to-[#b9902e] text-white hover:brightness-110 hover:scale-[1.02] transition-all shadow-sm hover:shadow-md"
          >
            <Link href="/skins-vote">
              <Palette className="size-4" />
              Votar Mejor Livery
            </Link>
          </Button>
        </div>
      </div>
      <TopThreeChampionship
        data={table}
        skinsEnabled={currentChampionship.skinsEnabled !== false}
        skinsFolder={currentChampionship.skinsFolder}
      />
      <div className="space-y-4">
        <Progress value={progressValue} />
        <div className="text-xs text-muted-foreground">{fechasCompletas}/{totalFechas} fechas</div>
      </div>
      <div className="space-y-4">
        <ChampionshipBallast data={table} allowedSessionIds={ballastSessionIds} />
        <div className="flex items-center justify-end">
          <ExportChampionshipButton data={table} />
        </div>
      </div>
    </div>
  )
}
