import Link from 'next/link'
// removed server-side admin gating; client toolbar handles admin visibility
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { Badge } from '@/components/ui/badge'
import DeleteSessionButton from '@/components/DeleteSessionButton'
import SessionsToolbar from '@/components/SessionsToolbar'
import { CalendarDays, Eye, Users } from 'lucide-react'
import path from 'node:path'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (process.env.NODE_ENV === 'development') await new Promise((r) => setTimeout(r, 600))
  const sessions = await loadLocalSessions()
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Sesiones</h1>
        {(() => {
          const existing = sessions.map((s) => path.basename(s.sourceFilePath))
          return <SessionsToolbar existing={existing} />
        })()}
      </div>
      {sessions.length === 0 && (
        <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">No se encontraron archivos JSON de sesiones.</div>
      )}
      {(() => {
        const grouped = new Map<string, typeof sessions>()
        for (const s of sessions) {
          const k = sessionDateKey(s)
          const arr = grouped.get(k) ?? []
          arr.push(s)
          grouped.set(k, arr)
        }
        const order = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b))
        return order.map((key) => {
          const list = grouped.get(key) ?? []
          const races = list.filter((x) => x.type.toUpperCase() === 'RACE').sort((a, b) => a.id.localeCompare(b.id))
          const raceIndexMap = new Map<string, number>()
          for (let i = 0; i < races.length; i++) raceIndexMap.set(races[i].id, i + 1)
          return (
            <div key={key} className="space-y-2">
              <div className="text-sm md:text-base font-semibold">{formatGroupLabel(key)}</div>
              <ul className="rounded-lg border divide-y">
                {list.map((s) => (
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
                        <span className="font-medium text-sm">{niceTrack(s.track)}</span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {s.drivers.length}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(s.date, s.id)}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-3">
                      <Link href={`/sessions/${s.id}`} aria-label="Ver sesión" className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-5 w-5" />
                      </Link>
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
