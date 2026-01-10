"use client"
import { useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Trophy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Timer } from 'lucide-react'
import type { DriverRow } from '@/components/DriversTable'
import type { Session } from '@/types/Session'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { labelType, niceTrack } from '@/lib/formatters'

export default function PilotProfileCard({ 
  data, 
  sessions, 
  numberToken,
  driverId,
  results
}: { 
  data: DriverRow[]; 
  sessions?: Session[]; 
  numberToken?: string;
  driverId?: string;
  results?: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>;
}) {
  const { user, isLoaded } = useUser()
  const [page, setPage] = useState(1)
  const pageSize = 10

  const steamId = useMemo(() => {
    if (driverId) return driverId
    const pm = (user?.publicMetadata || {}) as Record<string, unknown>
    const um = (user?.unsafeMetadata || {}) as Record<string, unknown>
    const raw = (um['steamId'] ?? pm['steamId'])
    return typeof raw === 'string' ? raw.trim() : ''
  }, [user, driverId])

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

  const championships = useMemo(() => {
    if (!steamId) return 0
    // Lautaro Natalini
    if (steamId === '76561199812903601') return 2
    return 0
  }, [steamId])

  const mySessionResults = useMemo(() => {
    if (results) return results
    if (!sessions || !steamId) return [] as Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>
    const list: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }> = []
    for (const s of sessions) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      list.push({ id: s.id, type: s.type, track: s.track, position: r?.position, dnf: r?.dnf })
    }
    // "la ultima primero" implies reverse chronological if sessions are chronological
    return list.reverse()
  }, [sessions, steamId, results])

  const totalPages = Math.ceil(mySessionResults.length / pageSize)
  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * pageSize
    return mySessionResults.slice(start, start + pageSize)
  }, [mySessionResults, page, pageSize])

  if (!isLoaded) return null
  if (!me) return null

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Block 1: Static Data */}
      <div className="rounded-md border p-4 bg-background">
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
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border text-[#9ca3af] border-[#9ca3af] font-mono">
                Steam ID: {steamId}
              </span>
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
              <span className={`text-base md:text-lg font-extrabold ${me.wins > 0 ? 'text-[#d8552b]' : 'text-[#9ca3af]'}`}>
                {me.wins}
              </span>
            </div>
          </div>
          {championships > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9ca3af]">Campeonatos</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: championships }).map((_, i) => (
                  <Trophy key={i} className="h-4 w-4 text-[#d8552b]" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Block 2: Sessions List */}
      {mySessionResults.length > 0 ? (
        <div className="flex-1 min-h-0 rounded-md border p-4 flex flex-col bg-background">
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                {paginatedSessions.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell><span className="text-sm">{labelType(it.type)}</span></TableCell>
                    <TableCell><span className="text-sm">{niceTrack(it.track)}</span></TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center rounded-full border font-extrabold w-14 h-10 text-lg ${
                        typeof it.position === 'number' && it.position > 0 ? 'bg-[#d8552b] border-[#d8552b] text-white' : 'border-[#9ca3af] text-[#9ca3af]'
                      }`}>
                        {typeof it.position === 'number' ? it.position : '—'}
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
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t mt-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                title="Primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                title="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : null}


    </div>
  )
}
