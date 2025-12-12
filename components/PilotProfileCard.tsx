"use client"
import { useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { Trophy } from 'lucide-react'
import type { DriverRow } from '@/components/DriversTable'
import type { Session } from '@/types/Session'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function PilotProfileCard({ data, sessions, numberToken }: { data: DriverRow[]; sessions?: Session[]; numberToken?: string }) {
  const { user, isLoaded } = useUser()
  const steamId = useMemo(() => {
    const pm = (user?.publicMetadata || {}) as Record<string, unknown>
    const um = (user?.unsafeMetadata || {}) as Record<string, unknown>
    const raw = (um['steamId'] ?? pm['steamId'])
    return typeof raw === 'string' ? raw.trim() : ''
  }, [user])
  const me = useMemo(() => {
    if (!steamId) return null
    const byId = data.find((d) => (d.driverId || '').trim() === steamId)
    return byId ?? null
  }, [steamId, data])
  const derivedNumber = useMemo(() => {
    if (numberToken && numberToken.length > 0) return numberToken
    const l = me?.livery
    if (!l || typeof l !== 'string') return undefined
    const m = l.match(/\d{1,3}/)
    return m ? m[0] : undefined
  }, [me, numberToken])
  const mySessionResults = useMemo(() => {
    if (!sessions || !steamId) return [] as Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>
    const list: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }> = []
    for (const s of sessions) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      list.push({ id: s.id, type: s.type, track: s.track, position: r?.position, dnf: r?.dnf })
    }
    return list
  }, [sessions, steamId])
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
  if (!isLoaded) return null
  if (!me) return null
  return (
    <div className="rounded-md border p-4 h-full flex flex-col min-h-0">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center justify-center self-start w-20 h-9 md:w-24 md:h-10 rounded-md bg-[#d8552b] text-white font-extrabold italic text-xl md:text-2xl">
          {derivedNumber ?? '—'}
        </span>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-2xl uppercase italic">{me.name}</span>
          </div>
          <div className="text-sm md:text-base font-semibold text-[#9ca3af]">{me.team ?? '-'}</div>
          <div className="mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full border text-[#9ca3af] border-[#9ca3af] font-mono">{steamId}</span>
          </div>
        </div>
        <div className="ml-auto flex items-start self-start">
          <span className="font-extrabold text-lg md:text-2xl text-[#d8552b]">
            {String(me.points).padStart(3, '0')} pts
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#9ca3af]">Carreras</span>
          <span className="text-base md:text-lg font-extrabold text-[#9ca3af]">{me.races}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#9ca3af]">Victorias</span>
          <div className="h-8 flex items-center gap-1">
            {me.wins > 0 ? (
              Array.from({ length: me.wins }).map((_, i) => (
                <Trophy key={i} className="h-4 w-4 md:h-5 md:w-5 text-[#d8552b]" />
              ))
            ) : (
              <span className="text-base md:text-lg font-extrabold text-[#9ca3af]">0</span>
            )}
          </div>
        </div>
      </div>
      
      {mySessionResults.length > 0 ? (
        <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Kartódromo</TableHead>
                <TableHead className="text-center">Posición</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySessionResults.map((it) => (
                <TableRow key={it.id}>
                  <TableCell><span className="text-sm">{labelType(it.type)}</span></TableCell>
                  <TableCell><span className="text-sm">{niceTrack(it.track)}</span></TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center rounded-full border font-extrabold w-14 h-10 text-lg ${
                      typeof it.position === 'number' && it.position > 0 ? 'bg-[#d8552b] border-[#d8552b] text-white' : 'border-[#9ca3af] text-[#9ca3af]'
                    }`}>
                      {typeof it.position === 'number' ? String(it.position).padStart(2, '0') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {it.dnf ? <span className="text-xs px-2 py-0.5 rounded-full border text-[#9ca3af] border-[#9ca3af]">DNF</span> : <span className="text-xs text-[#9ca3af]">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
