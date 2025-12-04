import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
// removed server-side admin gating; client toolbar handles admin visibility
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { Badge } from '@/components/ui/badge'
import DeleteSessionButton from '@/components/DeleteSessionButton'
import PublishSessionButton from '@/components/PublishSessionButton'
import SessionsToolbar from '@/components/SessionsToolbar'
import { CalendarDays, Eye, Users } from 'lucide-react'
import path from 'node:path'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (process.env.NODE_ENV === 'development') await new Promise((r) => setTimeout(r, 600))
  const sessions = await loadLocalSessions()
  const user = await currentUser().catch(() => null)
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdminRaw = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )
  const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
  const isAdmin = isAdminRaw || devBypass
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
  type Pub = { sessionId: string; published: boolean; date?: string }
  const isPub = (x: unknown): x is Pub => {
    if (!x || typeof x !== 'object') return false
    const o = x as { sessionId?: unknown; published?: unknown; date?: unknown }
    return typeof o.sessionId === 'string' && typeof o.published === 'boolean'
  }
  const publishedList = (publishedRemote ?? []).filter(isPub)
  const hasPublishConfig = publishedList.length > 0
  const publishedSet = new Set(publishedList.filter((p) => p.published === true).map((p) => p.sessionId))
  const publishedDateById = new Map<string, number>()
  for (const p of publishedList) {
    if (typeof p.date === 'string') {
      const d = new Date(p.date)
      if (!isNaN(d.getTime())) publishedDateById.set(p.sessionId, d.getTime())
    }
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
  const sessionsForViewer = isAdmin ? sessions : (hasPublishConfig ? sessions.filter((s) => publishedSet.has(s.id)) : sessions)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Sesiones</h1>
        {(() => {
          const existing = sessions.map((s) => path.basename(s.sourceFilePath))
          return <SessionsToolbar existing={existing} />
        })()}
      </div>
      {sessionsForViewer.length === 0 && (
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No se encontraron archivos JSON de sesiones.</div>
      )}
      {(() => {
        const grouped = new Map<string, typeof sessions>()
        for (const s of sessionsForViewer) {
          const k = sessionDateKey(s)
          const arr = grouped.get(k) ?? []
          arr.push(s)
          grouped.set(k, arr)
        }
        const order = Array.from(grouped.keys()).sort((a, b) => {
          const la = (grouped.get(a) ?? []).reduce((acc, s) => Math.max(acc, publishedDateById.get(s.id) ?? -1), -1)
          const lb = (grouped.get(b) ?? []).reduce((acc, s) => Math.max(acc, publishedDateById.get(s.id) ?? -1), -1)
          if (la !== lb) return lb - la
          return b.localeCompare(a)
        })
        return order.map((key) => {
          const list = grouped.get(key) ?? []
          const forViewer = isAdmin ? list : (hasPublishConfig ? list.filter((s) => publishedSet.has(s.id)) : list)
          if (forViewer.length === 0) return null
          const races = list.filter((x) => x.type.toUpperCase() === 'RACE').sort((a, b) => a.id.localeCompare(b.id))
          const raceIndexMap = new Map<string, number>()
          for (let i = 0; i < races.length; i++) raceIndexMap.set(races[i].id, i + 1)
          return (
            <div key={key} className="space-y-2">
              <div className="text-sm md:text-base font-semibold">{formatGroupLabel(key)}</div>
              <ul className="rounded-lg border divide-y">
                {forViewer
                  .slice()
                  .sort((a, b) => {
                    const pa = publishedSet.has(a.id) ? 1 : 0
                    const pb = publishedSet.has(b.id) ? 1 : 0
                    if (pa !== pb) return pb - pa
                    return b.id.localeCompare(a.id)
                  })
                  .map((s) => (
                  <li key={s.id} className="p-3 md:p-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <Badge
                          className={
                            s.type === 'RACE'
                              ? 'text-sm md:text-base px-3 py-0.5 bg-[#d8552b] text-white'
                              : s.type === 'QUALIFY'
                              ? 'text-sm md:text-base px-3 py-0.5'
                              : 'text-xs px-3 py-0.5'
                          }
                          variant={s.type === 'RACE' ? 'default' : s.type === 'QUALIFY' ? 'secondary' : 'outline'}
                        >
                          {s.type.toUpperCase() === 'RACE' ? `Carrera ${raceIndexMap.get(s.id) ?? 1}` : labelType(s.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {countById.get(s.id) ?? s.results.length}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(s.date, s.id)}
                          {' • '}
                          <span className="font-medium text-xs md:text-sm">{niceTrack(s.track)}</span>
                        </span>
                        {publishedSet.has(s.id) ? (
                          <Badge className="text-xs px-2 py-0.5 bg-[#2b855d] text-white" variant="default">Resultado oficial</Badge>
                        ) : (
                          <Badge className="text-xs px-2 py-0.5" variant="outline">Resultado provisorio</Badge>
                        )}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-3">
                      <Link href={`/sessions/${s.id}`} aria-label="Ver sesión" className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-5 w-5" />
                      </Link>
                      <PublishSessionButton id={s.id} />
                      <DeleteSessionButton id={s.id} label={`${labelType(s.type)} | ${niceTrack(s.track)} | ${formatDate(s.date, s.id)}`} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      })()}
    </div>
  )
}
