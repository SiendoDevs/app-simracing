import Link from 'next/link'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { Badge } from '@/components/ui/badge'
import DeleteSessionButton from '@/components/DeleteSessionButton'
import PublishSessionButton from '@/components/PublishSessionButton'
import SessionsToolbar from '@/components/SessionsToolbar'
import { CalendarDays, Eye, Users } from 'lucide-react'
import path from 'node:path'
import { headers } from 'next/headers'
import { championships, currentChampionship } from '@/data/championships'
import { loadPenalties } from '@/lib/penalties'
import { Button } from '@/components/ui/button'
import { readRedisItems, upstashConfigured } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (process.env.NODE_ENV === 'development') await new Promise((r) => setTimeout(r, 600))
  const sessions = await loadLocalSessions()
  
  const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
    ? `https://${process.env.VERCEL_URL}`
    : undefined
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_BASE_URL
    : undefined
  const fromHeaders = await (async () => { try { const h = await headers(); const host = h.get('x-forwarded-host') || h.get('host') || ''; const proto = h.get('x-forwarded-proto') || 'https'; return host ? `${proto}://${host}` : null } catch { return null } })()
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
  const publishedSet = new Set(pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map((p) => canonicalId((p as { sessionId: string }).sessionId)))

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
  const penaltiesLocal = (() => {
    try {
      return loadPenalties()
    } catch {
      return []
    }
  })()
  const penaltiesAll = ([...(penaltiesRemote ?? []), ...penaltiesLocal]).filter(isPen)

  const sessionById = new Map<string, (typeof sessions)[number]>()
  for (const s of sessions) sessionById.set(s.id, s)

  const penaltiesCountBySessionId = new Map<string, number>()
  for (const p of penaltiesAll) {
    const sid = normalizeId(p.sessionId)
    const s = sessionById.get(sid)
    if (!s) continue
    const t = (s.type || '').toUpperCase()
    if (t !== 'RACE' && t !== 'QUALIFY') continue
    const prev = penaltiesCountBySessionId.get(sid) ?? 0
    penaltiesCountBySessionId.set(sid, prev + 1)
  }

  const countById = new Map<string, number>()
  for (const s of sessions) countById.set(s.id, s.results.length)
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
  const formatGroupLabel = (key: string) => {
    const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!m) return 'Sin fecha'
    const [, y, mo, d] = m
    return `${d}/${mo}/${y}`
  }
  const labelType = (t: string) => {
    const up = t.toUpperCase()
    if (up === 'RACE') return 'Carrera'
    if (up === 'QUALIFY') return 'Clasificación'
    if (up === 'PRACTICE') return 'Práctica'
    return t
  }
  const formatId = (id: string) => {
    const m = id.match(/^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})/)
    if (!m) return id
    const [, y, mo, d, h, mi] = m
    return `${d}/${mo}/${y} ${h}:${mi}`
  }
  const formatDate = (date?: string, fallbackId?: string) => {
    if (typeof date === 'string') {
      const d = new Date(date)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yy = d.getFullYear()
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${dd}/${mm}/${yy} ${hh}:${mi}`
      }
    }
    return fallbackId ? formatId(fallbackId) : ''
  }
  const niceTrack = (raw?: string) => {
    if (!raw) return ''
    let t = raw.replace(/[_-]+/g, ' ').trim()
    t = t.replace(/^jotracks\s*/i, '')
    // Common collapsed names
    t = t.replace(/\bciudadevita\b/i, 'ciudad evita')
    t = t.replace(/\bbuenosaires\b/i, 'buenos aires')
    t = t.replace(/\bmardelplata\b/i, 'mar del plata')
    const small = new Set(['del', 'de', 'la', 'las', 'los', 'y'])
    const words = t.split(/\s+/).filter(Boolean)
    const map = (w: string) => {
      const lw = w.toLowerCase()
      if (lw === 'kartodromo') return 'Kartódromo'
      if (lw === 'zarate') return 'Zárate'
      if (lw === 'zn') return 'ZN'
      if (small.has(lw)) return lw
      return lw.charAt(0).toUpperCase() + lw.slice(1)
    }
    return words.map(map).join(' ')
  }
  const sessionsForViewer = sessions.filter((s) => {
    const key = sessionDateKey(s)
    if (!key || key === 'Sin-fecha') return false
    if (key < currentChampionship.startDate) return false
    if (currentChampionship.endDate && key > currentChampionship.endDate) return false
    return true
  })

  const season2 = championships.find((c) => c.id === 'season-2')
  const season2Title = season2?.title ?? 'Temporada 2'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Sesiones</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
            <Link href="/sessions/season-2">{`Ver sesiones · ${season2Title}`}</Link>
          </Button>
          {(() => {
            const existing = sessions.map((s) => path.basename(s.sourceFilePath))
            return <SessionsToolbar existing={existing} />
          })()}
        </div>
      </div>
      {sessionsForViewer.length === 0 && (
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">
          Aún no se han registrado sesiones recientes.
        </div>
      )}
      {(() => {
        const grouped = new Map<string, typeof sessionsForViewer>()
        for (const s of sessionsForViewer) {
          const k = sessionDateKey(s)
          const arr = grouped.get(k) ?? []
          arr.push(s)
          grouped.set(k, arr)
        }

        const order = Array.from(grouped.keys()).sort((a, b) => {
          if (a === 'Sin-fecha' && b === 'Sin-fecha') return 0
          if (a === 'Sin-fecha') return 1
          if (b === 'Sin-fecha') return -1
          return b.localeCompare(a)
        })

        return (
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base md:text-lg font-bold">{currentChampionship.title}</div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Campeonato activo</span>
            </div>
            {order.map((key) => {
              const list = grouped.get(key) ?? []
              const forViewer = list
              if (forViewer.length === 0) return null
              const races = list
                .filter((x) => x.type.toUpperCase() === 'RACE')
                .sort((a, b) => a.id.localeCompare(b.id))
              const raceIndexMap = new Map<string, number>()
              for (let i = 0; i < races.length; i++) raceIndexMap.set(races[i].id, i + 1)
              const totalPenalties = list.reduce((acc, s) => acc + (penaltiesCountBySessionId.get(s.id) ?? 0), 0)
              return (
                <div key={key} className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm md:text-base font-semibold">{formatGroupLabel(key)}</div>
                    {totalPenalties > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {totalPenalties} penalización{totalPenalties !== 1 ? 'es' : ''} (carrera/clasificación)
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 sm:space-y-0 sm:rounded-lg sm:border sm:divide-y">
                    {forViewer
                      .slice()
                      .sort((a, b) => {
                        const pa = publishedSet.has(canonicalId(a.id)) ? 1 : 0
                        const pb = publishedSet.has(canonicalId(b.id)) ? 1 : 0
                        if (pa !== pb) return pb - pa
                        return b.id.localeCompare(a.id)
                      })
                      .map((s) => (
                        <li
                          key={s.id}
                          className="relative rounded-lg border bg-background/40 p-3 shadow-xs sm:rounded-none sm:border-0 sm:bg-transparent sm:p-4 sm:shadow-none"
                        >
                          <Button asChild variant="outline" size="icon" className="absolute right-3 top-3 sm:hidden">
                            <Link href={`/sessions/${s.id}`} aria-label="Ver sesión">
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 pr-12 sm:pr-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  className={
                                    s.type === 'RACE'
                                      ? 'text-xs sm:text-sm px-2.5 py-0.5 bg-[#d8552b] text-white'
                                      : s.type === 'QUALIFY'
                                      ? 'text-xs sm:text-sm px-2.5 py-0.5'
                                      : 'text-xs px-2.5 py-0.5'
                                  }
                                  variant={s.type === 'RACE' ? 'default' : s.type === 'QUALIFY' ? 'secondary' : 'outline'}
                                >
                                  {s.type.toUpperCase() === 'RACE'
                                    ? `Carrera ${raceIndexMap.get(s.id) ?? 1}`
                                    : labelType(s.type)}
                                </Badge>
                                {publishedSet.has(canonicalId(s.id)) ? (
                                  <Badge className="text-xs px-2 py-0.5 bg-[#2b855d] text-white" variant="default">
                                    Resultado oficial
                                  </Badge>
                                ) : (
                                  <Badge className="text-xs px-2 py-0.5" variant="outline">
                                    Resultado provisorio
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5">
                                  <Users className="h-3 w-3" />
                                  {countById.get(s.id) ?? s.results.length}
                                </span>
                              </div>
                              <div className="mt-6 flex flex-col sm:mt-1 sm:flex-row sm:items-center sm:gap-2">
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDate(s.date, s.id)}
                                </span>
                                {niceTrack(s.track) ? (
                                  <span className="mt-1 text-sm font-semibold leading-tight wrap-break-word min-w-0 sm:mt-0 sm:text-sm md:text-base">
                                    {niceTrack(s.track)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start shrink-0">
                              <Button asChild variant="outline" size="icon" className="hidden sm:inline-flex">
                                <Link href={`/sessions/${s.id}`} aria-label="Ver sesión">
                                  <Eye className="size-4" />
                                </Link>
                              </Button>
                              <PublishSessionButton id={s.id} />
                              <DeleteSessionButton
                                id={s.id}
                                label={`${labelType(s.type)} | ${niceTrack(s.track)} | ${formatDate(s.date, s.id)}`}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
