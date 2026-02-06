"use client"
import { useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Trophy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
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
  results,
  showHeader = true,
  showStats = true,
  showSessions = true,
}: { 
  data: DriverRow[]; 
  sessions?: Session[]; 
  numberToken?: string;
  driverId?: string;
  results?: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>;
  showHeader?: boolean;
  showStats?: boolean;
  showSessions?: boolean;
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

  const baseRating = 1000 + me.points * 10
  const races = me.races > 0 ? me.races : 1
  const winRate = me.wins / races
  const podiumRate = me.podiums / races
  const top5Rate = me.top5 / races
  const top10Rate = me.top10 / races
  const cappedAvgPosition = me.avgPosition > 0 ? Math.min(me.avgPosition, 15) : 15
  const consistencyScore = (15 - cappedAvgPosition) * 10
  const performanceBonus = Math.round(
    winRate * 300 +
      podiumRate * 200 +
      top5Rate * 120 +
      top10Rate * 60 +
      consistencyScore
  )
  const totalPenaltySeconds = me.penaltySeconds ?? 0
  const penaltyRatingLoss = Math.floor(totalPenaltySeconds / 5) * 20
  const absences = typeof me.absences === 'number' ? me.absences : 0
  const absencePenalty = absences * 100
  const znRating = Math.max(0, Math.round(baseRating + performanceBonus - penaltyRatingLoss - absencePenalty))
  let znLicense = 'R'
  if (znRating >= 1200) znLicense = 'D'
  if (znRating >= 1600) znLicense = 'C'
  if (znRating >= 2200) znLicense = 'B'
  if (znRating >= 4000) znLicense = 'A'

  let licenseBlockClass = 'border border-[#1f2937]'
  let licenseGradient =
    'linear-gradient(135deg, rgba(31,41,55,0.85) 0%, rgba(24,24,27,0.98) 55%, #020204 100%)'
  let headerBorderColor = '#1f2937'
  if (znLicense === 'D') {
    licenseBlockClass = 'border border-[#1d4ed8]'
    licenseGradient =
      'linear-gradient(135deg, rgba(37,99,235,0.28) 0%, rgba(24,24,27,0.97) 55%, #020204 100%)'
    headerBorderColor = '#1d4ed8'
  }
  if (znLicense === 'C') {
    licenseBlockClass = 'border border-[#16a34a]'
    licenseGradient =
      'linear-gradient(135deg, rgba(34,197,94,0.30) 0%, rgba(24,24,27,0.97) 55%, #020204 100%)'
    headerBorderColor = '#16a34a'
  }
  if (znLicense === 'B') {
    licenseBlockClass = 'border border-[#f59e0b]'
    licenseGradient =
      'linear-gradient(135deg, rgba(245,158,11,0.32) 0%, rgba(24,24,27,0.97) 55%, #020204 100%)'
    headerBorderColor = '#f59e0b'
  }
  if (znLicense === 'A') {
    licenseBlockClass = 'border border-[#d8552b]'
    licenseGradient =
      'linear-gradient(135deg, rgba(216,85,43,0.36) 0%, rgba(24,24,27,0.97) 55%, #020204 100%)'
    headerBorderColor = '#d8552b'
  }

  let licenseBadgeClass =
    'inline-flex items-center justify-center h-7 px-3 rounded-full border font-bold text-xs md:text-sm bg-[#020617] text-white border-[#4b5563]'
  let numberBadgeClass = 'bg-[#020617] text-white'
  let pointsClass = 'text-[#9ca3af]'
  if (znLicense === 'D') {
    licenseBadgeClass =
      'inline-flex items-center justify-center h-7 px-3 rounded-full border font-bold text-xs md:text-sm bg-[#1d4ed8]/30 text-[#bfdbfe] border-[#1d4ed8]'
    numberBadgeClass = 'bg-[#1d4ed8] text-white'
    pointsClass = 'text-[#1d4ed8]'
  }
  if (znLicense === 'C') {
    licenseBadgeClass =
      'inline-flex items-center justify-center h-7 px-3 rounded-full border font-bold text-xs md:text-sm bg-[#16a34a]/30 text-[#bbf7d0] border-[#16a34a]'
    numberBadgeClass = 'bg-[#16a34a] text-white'
    pointsClass = 'text-[#16a34a]'
  }
  if (znLicense === 'B') {
    licenseBadgeClass =
      'inline-flex items-center justify-center h-7 px-3 rounded-full border font-bold text-xs md:text-sm bg-[#f59e0b]/25 text-[#fed7aa] border-[#f59e0b]'
    numberBadgeClass = 'bg-[#f59e0b] text-[#111827]'
    pointsClass = 'text-[#f59e0b]'
  }
  if (znLicense === 'A') {
    licenseBadgeClass =
      'inline-flex items-center justify-center h-7 px-3 rounded-full border font-bold text-xs md:text-sm bg-[#d8552b]/25 text-[#fed7aa] border-[#d8552b]'
    numberBadgeClass = 'bg-[#d8552b] text-white'
    pointsClass = 'text-[#d8552b]'
  }

  const headerOnly = showHeader && !showStats && !showSessions

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {showHeader && (
        <div
          className={`rounded-md p-4 ${licenseBlockClass} ${
            headerOnly ? 'h-full flex flex-col' : ''
          }`}
          style={{ backgroundImage: licenseGradient }}
        >
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center justify-center self-start w-20 h-9 md:w-24 md:h-10 rounded-md font-extrabold italic text-xl md:text-2xl ${numberBadgeClass}`}
            >
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
              <span className={`font-extrabold text-lg md:text-2xl ${pointsClass}`}>
                {String(me.points).padStart(3, '0')} pts
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9ca3af]">Carreras</span>
              <span className="text-base md:text-lg font-extrabold text-[#9ca3af]">{me.races}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9ca3af]">Victorias</span>
              <div className="h-8 flex items-center gap-1">
                <span className={`text-base md:text-lg font-extrabold ${me.wins > 0 ? pointsClass : 'text-[#9ca3af]'}`}>
                  {me.wins}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9ca3af]">ZN Rating</span>
              <span className="text-base md:text-lg font-extrabold text-[#9ca3af]">{znRating}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#9ca3af]">Licencia</span>
              <span className={licenseBadgeClass}>{znLicense}</span>
            </div>
            {championships > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#9ca3af]">Campeonatos</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: championships }).map((_, i) => (
                    <Trophy key={i} className={`h-4 w-4 ${pointsClass}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showStats && (
        <div
          className={`rounded-md overflow-hidden ${licenseBlockClass}`}
          style={{ backgroundImage: licenseGradient }}
        >
          <div
            className="p-2 px-4 border-b bg-[#020617]/20"
            style={{ borderBottomColor: headerBorderColor }}
          >
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Estadísticas</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-[#ffffff0d]">
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Carreras
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Victorias
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Top 5
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Top 10
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Podios
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Promedio
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold text-[#f9fafb]">
                    Vueltas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.races}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.wins}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.top5}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.top10}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.podiums}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.avgPosition}
                  </TableCell>
                  <TableCell className="text-center font-extrabold text-lg text-white">
                    {me.totalLaps}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showSessions && mySessionResults.length > 0 ? (
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
