import Link from 'next/link'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { loadExclusions, applyExclusionsToSession } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { loadPenalties, applyPenaltiesToSession } from '@/lib/penalties'
import BestLapCard from '@/components/BestLapCard'
import MostOvertakesCard from '@/components/MostOvertakesCard'
import RaceResults from '@/components/RaceResults'
import IncidentsList from '@/components/IncidentsList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessions = await loadLocalSessions()
  const raw = sessions.find((s) => s.id === id)
  if (!raw) return <div className="p-6">Sesión no encontrada</div>
  const origin = (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0)
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'http://localhost:3000'
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
  const exclusions = exclusionsRemote ?? loadExclusions()
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
  const penalties = penaltiesRemote ?? loadPenalties()
  const session = applyPenaltiesToSession(excluded, penalties)
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
  return (
    <div className="p-4 md:p-6 space-y-3 md:space-y-4">
      <div className="text-sm">
        <Link href="/sessions" className="underline text-muted-foreground hover:text-foreground">Sesiones</Link>
      </div>
      <h1 className="text-xl md:text-2xl">
        <span className="font-bold">{labelType(session.type)}</span>
        {' | '}
        <span className="font-normal">{niceTrack(session.track)}</span>
        {' | '}
        <span className="font-normal">{formatDateLong(session.date, id)}</span>
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <BestLapCard session={session} />
        {session.type === 'RACE' && <MostOvertakesCard session={session} />}
      </div>
      <RaceResults session={session} allSessions={sessions} exclusions={exclusions} />
      
      <IncidentsList incidents={session.incidents} />
    </div>
  )
}
