import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { applyExclusionsToSession } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
import BestLapCard from '@/components/BestLapCard'
import MostOvertakesCard from '@/components/MostOvertakesCard'
import RaceResults from '@/components/RaceResults'
import IncidentsList from '@/components/IncidentsList'
import PublishSessionButton from '@/components/PublishSessionButton'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import { resolveSkinImageFor } from '@/lib/skins'
import CheckeredFlagIcon from '@/components/CheckeredFlagIcon'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const normalizedId = id.includes(':') ? id.split(':').pop() as string : id
  const sessions = await loadLocalSessions()
  const raw = sessions.find((s) => s.id === normalizedId)
  if (!raw) return <div className="p-6">Sesión no encontrada</div>
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
  const pubRaw = publishedRemote ?? []
  const pubEntries = Array.isArray(pubRaw) ? pubRaw.filter((x) => x && typeof (x as { sessionId?: unknown }).sessionId === 'string') : []
  const toBool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1'
  const hasPublishConfig = pubEntries.length > 0
  const normalizeId2 = (s: string) => (s.includes(':') ? (s.split(':').pop() as string) : s)
  const canonicalId2 = (s: string) => {
    const n = normalizeId2(s)
    const m = n.match(/^([0-9]{4})_([0-9]{2})_([0-9]{2})_([0-9]{1,2})_([0-9]{1,2})_(.+)$/)
    if (!m) return n
    const [, y, mo, d, h, mi, t] = m
    return `${y}_${mo}_${d}_${h}_${Number(mi)}_${t.toUpperCase()}`
  }
  const publishedSet = new Set(pubEntries.filter((p) => toBool((p as { published?: unknown }).published)).map((p) => canonicalId2((p as { sessionId: string }).sessionId)))
  const isPublished = publishedSet.has(canonicalId2(normalizedId))
  if (hasPublishConfig && !isPublished && !isAdmin) {
    return (
      <div className="p-6 space-y-2">
        <div className="text-sm text-muted-foreground">Sesión no publicada</div>
        <div className="text-xs text-muted-foreground">Vuelve pronto: se publicará cuando finalice la revisión.</div>
      </div>
    )
  }
  const exclusionsRemote = await (async () => {
    try {
      const r1 = await fetch('/api/exclusions', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/exclusions`, { cache: 'no-store' })
      if (r2.ok) {
        const j = await r2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const exclusions = exclusionsRemote ?? []
  console.log('[sessions/page] sessionId', normalizedId)
  console.log('[sessions/page] exclusions fetched', Array.isArray(exclusionsRemote) ? exclusionsRemote.length : (exclusionsRemote ? Object.keys(exclusionsRemote as Record<string, unknown>).length : 0))
  const withDnf = applyDnfByLaps(raw)
  const excluded = applyExclusionsToSession(withDnf, exclusions)
  const penaltiesRemote = await (async () => {
    try {
      const res = await fetch('/api/penalties', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const penalties = penaltiesRemote ?? []
  console.log('[sessions/page] penalties fetched', Array.isArray(penaltiesRemote) ? penaltiesRemote.length : (penaltiesRemote ? Object.keys(penaltiesRemote as Record<string, unknown>).length : 0))
  const session = applyPenaltiesToSession(excluded, penalties)
  console.log('[sessions/page] results size after apply', session.results.length)
  const labelType = (t: string) => {
    const up = t.toUpperCase()
    if (up === 'RACE') return 'Carrera'
    if (up === 'QUALIFY') return 'Clasificación'
    if (up === 'PRACTICE') return 'Práctica'
    return t
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
  const formatDateLong = (date?: string, fallbackId?: string) => {
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    let d: Date | null = null
    if (typeof date === 'string') {
      const parsed = new Date(date)
      if (!isNaN(parsed.getTime())) d = parsed
    }
    if (!d && typeof fallbackId === 'string') {
      const m = fallbackId.match(/^(\d{4})_(\d{2})_(\d{2})/)
      if (m) {
        const [, y, mo, dd] = m
        d = new Date(Number(y), Number(mo) - 1, Number(dd))
      }
    }
    if (!d) return ''
    const dayName = days[d.getDay()]
    const dayNum = d.getDate()
    const monthName = months[d.getMonth()]
    return `${dayName} ${dayNum} de ${monthName}`
  }
  const winner = session.results.find((r) => r.position === 1) ?? session.results[0]
  const winnerName = winner ? (session.drivers.find((d) => d.id === winner.driverId)?.name ?? winner.driverId) : undefined
  const winnerPreview = winner ? resolveSkinImageFor(winner.skin, winnerName) : undefined
  return (
    <div className="p-4 md:p-6 space-y-3 md:space-y-4">
      <div className="text-sm">
        <Link href="/sessions" className="underline text-muted-foreground hover:text-foreground">Sesiones</Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl">
          <span className="font-bold">{labelType(session.type)}</span>
          {' | '}
          <span className="font-normal">{niceTrack(session.track)}</span>
          {' | '}
          <span className="font-normal">{formatDateLong(session.date, normalizedId)}</span>
        </h1>
        {session.type.toUpperCase() === 'RACE' ? (
          <CheckeredFlagIcon className="w-9 h-9 md:w-10 md:h-10" />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <PublishSessionButton id={session.id} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <BestLapCard session={session} />
        {session.type === 'RACE' && <MostOvertakesCard session={session} />}
        <Card className="relative overflow-hidden aspect-video border-black">
          {winnerPreview ? (
            <Image src={winnerPreview} alt={`Preview ${session.type === 'QUALIFY' ? 'Pole Position' : 'Ganador'} ${winnerName ?? ''}`} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
          <div className="absolute top-0 left-0 z-10 p-4">
            <span className="inline-flex items-center gap-2 text-white text-lg font-bold">
              <Trophy className="h-5 w-5 text-white" />
              {session.type === 'QUALIFY' ? 'Pole Position' : 'Ganador'}
            </span>
          </div>
          {winnerName ? (
            <div className="absolute bottom-0 left-0 z-10 p-4">
              <span className="font-(family-name:--font-saira) font-black text-white text-md md:text-lg uppercase italic">
                {winnerName}
              </span>
            </div>
          ) : null}
        </Card>
      </div>
      <RaceResults session={session} allSessions={sessions} exclusions={exclusions} />
      
      <IncidentsList incidents={session.incidents} />
    </div>
  )
}
