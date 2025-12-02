"use client"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowUp, ArrowDown, UserCheck, UserX, Weight, Loader2, Timer } from 'lucide-react'
import { useUser } from "@clerk/nextjs"
import { toast } from 'sonner'
import type { Session } from '@/types/Session'
import type { Exclusion } from '@/lib/exclusions'
import { applySessionPoints, pointsForPosition } from '@/lib/calculatePoints'
 

function formatTotalTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const millis = ms % 1000
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

 

export default function RaceResults({ session, allSessions, exclusions }: { session: Session; allSessions?: Session[]; exclusions?: Exclusion[] }) {
  const { user } = useUser()
  const isAdmin = ((user?.publicMetadata as Record<string, unknown>)?.role === 'admin')
  const router = useRouter()
  const [localExclusions, setLocalExclusions] = useState<Exclusion[]>(exclusions ?? [])
  const sWithPoints = applySessionPoints(session)
  const ballastAfter = computeBallastWithExclusions(allSessions, session.id, localExclusions, true)
  const ballastBefore = computeBallastWithExclusions(allSessions, session.id, localExclusions, false)
  const [loading, setLoading] = useState(false)
  const [openExcludeFor, setOpenExcludeFor] = useState<string | null>(null)
  const [openReincFor, setOpenReincFor] = useState<string | null>(null)
  const [openPenaltyFor, setOpenPenaltyFor] = useState<string | null>(null)
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0)
  const [penaltiesMap, setPenaltiesMap] = useState<Map<string, number>>(new Map())
  const [ballastAdjMap, setBallastAdjMap] = useState<Map<string, number>>(new Map())
  useEffect(() => {
    const incoming = exclusions ?? []
    console.log('[RaceResults] incoming exclusions', session.id, incoming.length)
    setLocalExclusions(incoming)
    if (incoming.length === 0) {
      ;(async () => {
        let list: Exclusion[] = []
        try {
          const r1 = await fetch('/api/exclusions', { cache: 'no-store' })
          if (r1.ok) {
            const j = await r1.json()
            if (Array.isArray(j)) list = j as Exclusion[]
            else if (j && typeof j === 'object') list = Object.values(j as Record<string, unknown>) as Exclusion[]
          }
        } catch {}
        if (list.length === 0 && typeof window !== 'undefined') {
          try {
            const r2 = await fetch(`${location.origin}/api/exclusions`, { cache: 'no-store' })
            if (r2.ok) {
              const j = await r2.json()
              if (Array.isArray(j)) list = j as Exclusion[]
              else if (j && typeof j === 'object') list = Object.values(j as Record<string, unknown>) as Exclusion[]
            }
          } catch {}
        }
        console.log('[RaceResults] fallback fetched exclusions', session.id, list.length)
        setLocalExclusions(list)
      })()
    }
  }, [exclusions, session.id])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/penalties')
        if (!res.ok) throw new Error('err')
        const list = await res.json()
        const map = new Map<string, number>()
        if (Array.isArray(list)) {
          for (const p of list) {
            if (p && p.sessionId === session.id && typeof p.driverId === 'string' && typeof p.seconds === 'number') {
              map.set(p.driverId, (map.get(p.driverId) ?? 0) + p.seconds)
            }
          }
        }
        if (active) setPenaltiesMap(map)
      } catch {
        if (active) setPenaltiesMap(new Map())
      } finally {}
    })()
    return () => { active = false }
  }, [session.id])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/ballast')
        if (!res.ok) throw new Error('err')
        const list = await res.json()
        const map = new Map<string, number>()
        if (Array.isArray(list)) {
          for (const b of list) {
            if (b && b.sessionId === session.id && typeof b.driverId === 'string' && typeof b.kg === 'number') {
              map.set(b.driverId, (map.get(b.driverId) ?? 0) + b.kg)
            }
          }
        }
        if (active) setBallastAdjMap(map)
      } catch {
        if (active) setBallastAdjMap(new Map())
      } finally {}
    })()
    return () => { active = false }
  }, [session.id])
  const excludedSet = (() => {
    const set = new Set<string>((localExclusions ?? [])
      .filter((e) => e.exclude && e.sessionId === session.id)
      .map((e) => e.driverId))
    if (typeof window !== 'undefined') console.log('[RaceResults] excludedSet', session.id, Array.from(set))
    return set
  })()
  const displayResults = (() => {
    if (session.type.toUpperCase() === 'RACE') {
      const finishers = sWithPoints.results.filter((r) => !r.dnf && !excludedSet.has(r.driverId))
      const dnfs = sWithPoints.results.filter((r) => r.dnf || excludedSet.has(r.driverId))
      const adjusted = finishers
        .map((r) => {
          const secs = penaltiesMap.get(r.driverId) ?? 0
          const addMs = Math.max(0, Math.floor(secs * 1000))
          const total = typeof r.totalTimeMs === 'number' ? (r.totalTimeMs as number) : undefined
          const totalAdj = total != null ? total + addMs : undefined
          return { ...r, totalTimeMs: totalAdj }
        })
        .sort((a, b) => {
          const la = a.lapsCompleted ?? 0
          const lb = b.lapsCompleted ?? 0
          if (la !== lb) return lb - la
          const ta = a.totalTimeMs
          const tb = b.totalTimeMs
          if (ta != null && tb != null) return ta - tb
          if (ta != null) return -1
          if (tb != null) return 1
          return a.position - b.position
        })
        .map((r, idx) => ({ ...r, position: idx + 1, points: pointsForPosition(idx + 1, session.type) }))
      const appended = dnfs.map((r, idx) => ({ ...r, position: adjusted.length + idx + 1, points: 0 }))
      const out = [...adjusted, ...appended]
      if (typeof window !== 'undefined') console.log('[RaceResults] displayResults RACE positions', out.map((r) => [r.driverId, r.position]))
      return out
    } else {
      const nonExcluded = sWithPoints.results.filter((r) => !excludedSet.has(r.driverId))
      const excluded = sWithPoints.results.filter((r) => excludedSet.has(r.driverId))
      const adjusted = nonExcluded
        .map((r) => {
          const secs = penaltiesMap.get(r.driverId) ?? 0
          const addMs = Math.max(0, Math.floor(secs * 1000))
          const best = typeof r.bestLapMs === 'number' ? (r.bestLapMs as number) : undefined
          const bestAdj = best != null ? best + addMs : undefined
          return { ...r, bestLapMs: bestAdj }
        })
        .sort((a, b) => {
          const ba = a.bestLapMs
          const bb = b.bestLapMs
          if (ba != null && bb != null) return ba - bb
          if (ba != null) return -1
          if (bb != null) return 1
          return a.position - b.position
        })
        .map((r, idx) => ({ ...r, position: idx + 1, points: pointsForPosition(idx + 1, session.type) }))
      const appended = excluded.map((r, idx) => ({ ...r, dnf: true, position: adjusted.length + idx + 1, points: 0 }))
      const out = [...adjusted, ...appended]
      if (typeof window !== 'undefined') console.log('[RaceResults] displayResults QUAL positions', out.map((r) => [r.driverId, r.position]))
      return out
    }
  })()
  return (
    <div className="rounded-md border p-3 md:p-4">
      <h2 className="text-base md:text-lg font-semibold">Resultados</h2>
      <div className="overflow-x-auto -mx-3 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">#</TableHead>
            <TableHead className="text-xs md:text-sm">Piloto</TableHead>
            <TableHead className="text-xs md:text-sm">Equipo</TableHead>
            {session.type === 'RACE' && <TableHead className="text-xs md:text-sm">Pos Ganadas</TableHead>}
            <TableHead className="text-xs md:text-sm">Mejor Vuelta</TableHead>
            <TableHead className="text-xs md:text-sm">Vueltas</TableHead>
            <TableHead className="text-xs md:text-sm">Tiempo Total</TableHead>
            <TableHead className="text-xs md:text-sm">Puntos</TableHead>
            <TableHead className="text-xs md:text-sm">Lastre</TableHead>
            {isAdmin && <TableHead className="text-xs md:text-sm text-right">Acción</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayResults.map((r) => {
            const d = session.drivers.find((x) => x.id === r.driverId)
            const isExcluded = excludedSet.has(r.driverId)
            return (
              <TableRow
                key={r.driverId + r.position}
                className={`${r.position === 1 ? 'bg-[#d8552b]/20 hover:bg-transparent' : r.position === 2 ? 'bg-[#d8552b]/12 hover:bg-transparent' : r.position === 3 ? 'bg-[#d8552b]/6 hover:bg-transparent' : ''} ${(isExcluded || r.dnf) ? 'opacity-60' : ''}` }
              >
                <TableCell>
                  <span className="inline-flex items-center justify-center w-16 h-7 md:w-20 md:h-8 rounded-md bg-[#d8552b] text-white font-bold text-sm md:text-lg">
                    {r.position}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-base md:text-lg">{d?.name ?? r.driverId}</span>
                  {r.dnf ? <span className="ml-2 text-xs px-2 py-0.5 rounded-full border text-[#9ca3af] border-[#9ca3af]">DNF</span> : null}
                  {isExcluded ? <span className="ml-2 text-xs px-2 py-0.5 rounded-full border text-[#9ca3af] border-[#9ca3af]">Excluido</span> : null}
                </TableCell>
                <TableCell>
                  <span className="text-xs md:text-sm text-[#9ca3af]">{d?.team ?? '-'}</span>
                </TableCell>
                {session.type === 'RACE' ? (
                  <TableCell>
                    {typeof r.gridPosition === 'number' ? (
                      (() => {
                        const diff = r.gridPosition - r.position
                        const positive = diff > 0
                        const negative = diff < 0
                        const value = Math.abs(diff)
                        return (
                          <span className={`inline-flex items-center gap-1 text-sm md:text-base font-semibold ${positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-green-600'}`}>
                            {positive ? <ArrowUp className="h-4 w-4 md:h-5 md:w-5" /> : negative ? <ArrowDown className="h-4 w-4 md:h-5 md:w-5" /> : null}
                            {value}
                          </span>
                        )
                      })()
                    ) : (
                      '-'
                    )}
                  </TableCell>
                ) : null}
                <TableCell>{(() => {
                  const secs = penaltiesMap.get(r.driverId) ?? 0
                  const base = r.bestLapMs
                  const adj = (session.type.toUpperCase() === 'RACE') ? base : (base != null ? base + secs * 1000 : undefined)
                  const show = adj ?? base
                  return show != null ? (show / 1000).toFixed(3) + 's' : '-'
                })()}</TableCell>
                <TableCell>{(() => {
                  const lc = typeof r.lapsCompleted === 'number' ? r.lapsCompleted : session.laps.filter((l) => l.driverId === r.driverId).length
                  return lc > 0 ? lc : '-'
                })()}</TableCell>
                <TableCell>
                  {(() => {
                    const secs = penaltiesMap.get(r.driverId) ?? 0
                    const displayMs = typeof r.totalTimeMs === 'number' ? (r.totalTimeMs as number) : undefined
                    return (
                      <span className="inline-flex items-center gap-1">
                        {displayMs != null ? formatTotalTime(displayMs) : (r.totalTimeMs != null ? formatTotalTime(r.totalTimeMs) : '-')}
                        {(secs > 0 && session.type.toUpperCase() === 'RACE') ? (
                          <span className="inline-flex items-center gap-1 text-[#d8552b] font-semibold">
                            +{secs}s
                          </span>
                        ) : null}
                      </span>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const val = (isExcluded || r.dnf) ? 0 : (r.points ?? 0)
                    const positive = val > 0
                    return (
                      <span className={`inline-flex items-center justify-center rounded-full border font-bold w-8 h-8 text-sm md:w-9 md:h-9 md:text-base ${positive ? 'border-[#d8552b] text-[#d8552b]' : 'border-[#9ca3af] text-[#9ca3af]'}`}>{val}</span>
                    )
                  })()}
                </TableCell>
                <TableCell>{((isExcluded ? (ballastBefore.get(r.driverId) ?? 0) : (ballastAfter.get(r.driverId) ?? 0)) + (ballastAdjMap.get(r.driverId) ?? 0))} kg</TableCell>
                {isAdmin && (
                <TableCell className="text-right">
                  <div className="inline-flex items-center justify-end gap-2">
                    {session.type.toUpperCase() === 'RACE' && (
                    <Dialog open={openPenaltyFor === r.driverId} onOpenChange={(v) => { if (v) setLoading(false); setOpenPenaltyFor(v ? r.driverId : null); if (!v) setLoading(false) }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon-sm" aria-label="Penalizar" onClick={() => { setLoading(false); setPenaltySeconds(0); setOpenPenaltyFor(r.driverId) }}>
                          <Timer className="size-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Penalizar tiempo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Penalizar a <span className="font-bold text-[#d8552b]">{d?.name ?? r.driverId}</span> en esta sesión.</div>
                          <input className="w-full border rounded-md p-2 text-sm" type="number" min={0} step={1} value={penaltySeconds} onChange={(e) => setPenaltySeconds(Number(e.target.value) || 0)} placeholder="Segundos" />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">Cancelar</Button>
                          </DialogClose>
                          <Button
                            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40"
                            disabled={loading}
                            onClick={async () => {
                              try {
                                setLoading(true)
                                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                                const res = await fetch('/api/penalties', {
                                  method: 'POST',
                                  headers: adminToken ? { 'Content-Type': 'application/json', 'x-admin-token': adminToken } : { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, seconds: penaltySeconds }),
                                })
                                if (!res.ok) throw new Error('error')
                                toast.success('Penalización aplicada', { description: d?.name ?? r.driverId })
                                setPenaltiesMap((prev) => {
                                  const next = new Map(prev)
                                  if (penaltySeconds > 0) next.set(r.driverId, penaltySeconds)
                                  else next.delete(r.driverId)
                                  return next
                                })
                                setOpenPenaltyFor(null)
                                router.refresh()
                              } catch {
                                toast.error('No se pudo penalizar', { description: d?.name ?? r.driverId })
                                setLoading(false)
                              }
                            }}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    )}
                    <Dialog open={openPenaltyFor === r.driverId + ':ballast'} onOpenChange={(v) => { if (v) setLoading(false); setOpenPenaltyFor(v ? r.driverId + ':ballast' : null); if (!v) setLoading(false) }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon-sm" aria-label="Lastre" onClick={() => { setLoading(false); setOpenPenaltyFor(r.driverId + ':ballast') }}>
                          <Weight className="size-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar lastre</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Aplicar lastre adicional a <span className="font-bold text-[#d8552b]">{d?.name ?? r.driverId}</span> en esta sesión.</div>
                          <input className="w-full border rounded-md p-2 text-sm" type="number" min={0} step={1} value={(ballastAdjMap.get(r.driverId) ?? 0)} onChange={(e) => {
                            const val = Math.max(0, Math.floor(Number(e.target.value) || 0))
                            setBallastAdjMap((prev) => {
                              const next = new Map(prev)
                              if (val > 0) next.set(r.driverId, val)
                              else next.delete(r.driverId)
                              return next
                            })
                          }} placeholder="Kilogramos" />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">Cancelar</Button>
                          </DialogClose>
                          <Button
                            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40"
                            disabled={loading}
                            onClick={async () => {
                              try {
                                setLoading(true)
                                const kg = ballastAdjMap.get(r.driverId) ?? 0
                                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                                const res = await fetch('/api/ballast', {
                                  method: 'POST',
                                  headers: adminToken ? { 'Content-Type': 'application/json', 'x-admin-token': adminToken } : { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, kg }),
                                })
                                if (!res.ok) throw new Error('error')
                                toast.success('Lastre actualizado', { description: d?.name ?? r.driverId })
                                setOpenPenaltyFor(null)
                                router.refresh()
                              } catch {
                                toast.error('No se pudo aplicar lastre', { description: d?.name ?? r.driverId })
                                setLoading(false)
                              }
                            }}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirmar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {session.type.toUpperCase() === 'RACE' && isExcluded ? (
                      <Dialog open={openReincFor === r.driverId} onOpenChange={(v) => { if (v) setLoading(false); setOpenReincFor(v ? r.driverId : null); if (!v) setLoading(false) }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon-sm" aria-label="Reincorporar" onClick={() => { setLoading(false); setOpenReincFor(r.driverId) }}>
                            <UserCheck className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reincorporar piloto</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-muted-foreground">Confirmar reincorporación de <span className="font-bold text-[#d8552b]">{d?.name ?? r.driverId}</span> en esta sesión.</div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="ghost">Cancelar</Button>
                            </DialogClose>
                              <Button
                                className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40"
                                disabled={loading}
                                onClick={async () => {
                                  try {
                                    setLoading(true)
                                    const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                                  const res = await fetch('/api/exclusions', {
                                    method: 'POST',
                                    headers: adminToken ? { 'Content-Type': 'application/json', 'x-admin-token': adminToken } : { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, exclude: false }),
                                  })
                                  if (!res.ok) throw new Error('error')
                                  toast.success('Piloto reincorporado', { description: d?.name ?? r.driverId })
                                    setOpenReincFor(null)
                                    setLocalExclusions((prev) => {
                                      const next = [...prev]
                                      const idx = next.findIndex((e) => e.driverId === r.driverId && e.sessionId === session.id)
                                      const entry = { driverId: r.driverId, sessionId: session.id, exclude: false }
                                      if (idx >= 0) next[idx] = entry
                                      else next.push(entry)
                                      return next
                                    })
                                    try {
                                      const sync = await fetch('/api/exclusions', { cache: 'no-store' })
                                      if (sync.ok) {
                                        const j = await sync.json()
                                        const list = Array.isArray(j) ? j : (j && typeof j === 'object' ? Object.values(j as Record<string, unknown>) : [])
                                        setLocalExclusions(list as Array<{ driverId: string; sessionId: string; exclude: boolean }>)
                                      }
                                    } catch {}
                                    
                                  } catch {
                                    toast.error('No se pudo reincorporar', { description: d?.name ?? r.driverId })
                                    setLoading(false)
                                  }
                                }}
                              >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirmar
                              </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : session.type.toUpperCase() === 'RACE' ? (
                      <Dialog open={openExcludeFor === r.driverId} onOpenChange={(v) => { if (v) setLoading(false); setOpenExcludeFor(v ? r.driverId : null); if (!v) setLoading(false) }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon-sm" aria-label="Excluir" onClick={() => { setLoading(false); setOpenExcludeFor(r.driverId) }}>
                            <UserX className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Excluir piloto</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-muted-foreground">Confirmar exclusión de <span className="font-bold text-[#d8552b]">{d?.name ?? r.driverId}</span> de esta sesión.</div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="ghost">Cancelar</Button>
                            </DialogClose>
                              <Button
                                className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40"
                                disabled={loading}
                                onClick={async () => {
                                  try {
                                    setLoading(true)
                                    const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                                  const res = await fetch('/api/exclusions', {
                                    method: 'POST',
                                    headers: adminToken ? { 'Content-Type': 'application/json', 'x-admin-token': adminToken } : { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, exclude: true }),
                                  })
                                  if (!res.ok) throw new Error('error')
                                  toast.success('Piloto excluido', { description: d?.name ?? r.driverId })
                                    setOpenExcludeFor(null)
                                    setLocalExclusions((prev) => {
                                      const next = [...prev]
                                      const idx = next.findIndex((e) => e.driverId === r.driverId && e.sessionId === session.id)
                                      const entry = { driverId: r.driverId, sessionId: session.id, exclude: true }
                                      if (idx >= 0) next[idx] = entry
                                      else next.push(entry)
                                      return next
                                    })
                                    try {
                                      const sync = await fetch('/api/exclusions', { cache: 'no-store' })
                                      if (sync.ok) {
                                        const j = await sync.json()
                                        const list = Array.isArray(j) ? j : (j && typeof j === 'object' ? Object.values(j as Record<string, unknown>) : [])
                                        setLocalExclusions(list as Array<{ driverId: string; sessionId: string; exclude: boolean }>)
                                      }
                                    } catch {}
                                    
                                  } catch {
                                    toast.error('No se pudo excluir', { description: d?.name ?? r.driverId })
                                    setLoading(false)
                                  }
                                }}
                              >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirmar
                              </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                  </div>
                </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
function computeBallastWithExclusions(allSessions: Session[] | undefined, targetId: string, exclusions?: { driverId: string; sessionId: string; exclude: boolean }[], includeTarget?: boolean) {
  const map = new Map<string, number>()
  if (!allSessions) return map
  for (const s of allSessions) {
    if (!includeTarget && s.id === targetId) break
    const set = new Set<string>((exclusions ?? []).filter((e) => e.sessionId === s.id && e.exclude).map((e) => e.driverId))
    const nonExcluded = s.results.filter((r) => !set.has(r.driverId))
    const adjustedPositions = nonExcluded.map((r, idx) => ({ ...r, position: idx + 1 }))
    if (s.type === 'RACE') {
      for (const r of adjustedPositions) {
        const curr = map.get(r.driverId) ?? 0
        if (r.dnf) {
          map.set(r.driverId, Math.max(0, curr - 5))
        } else if (r.position === 1) {
          map.set(r.driverId, curr + 5)
        } else if (r.position >= 4) {
          map.set(r.driverId, 0)
        }
      }
    }
    if (includeTarget && s.id === targetId) break
  }
  return map
}
