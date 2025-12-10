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

 

export default function RaceResults({ session, exclusions }: { session: Session; allSessions?: Session[]; exclusions?: Exclusion[] }) {
  const { user } = useUser()
  const isAdmin = ((user?.publicMetadata as Record<string, unknown>)?.role === 'admin')
  const router = useRouter()
  const [localExclusions, setLocalExclusions] = useState<Exclusion[]>(exclusions ?? [])
  const sWithPoints = applySessionPoints(session)
  const [loading, setLoading] = useState(false)
  const [hasDrafts, setHasDrafts] = useState(false)
  
  const [openExcludeFor, setOpenExcludeFor] = useState<string | null>(null)
  const [openReincFor, setOpenReincFor] = useState<string | null>(null)
  const [openPenaltyFor, setOpenPenaltyFor] = useState<string | null>(null)
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0)
  const [penaltiesMap, setPenaltiesMap] = useState<Map<string, number>>(new Map())
  const [ballastAdjMap, setBallastAdjMap] = useState<Map<string, number>>(new Map())
  const [penaltiesLoaded, setPenaltiesLoaded] = useState(false)
  const [exclusionsLoaded, setExclusionsLoaded] = useState(false)
  const [ballastLoaded, setBallastLoaded] = useState(false)
  useEffect(() => {
    const incoming = exclusions ?? []
    console.log('[RaceResults] incoming exclusions', session.id, incoming.length)
    setLocalExclusions(incoming)
    if (incoming.length > 0) setExclusionsLoaded(true)
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
        setExclusionsLoaded(true)
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
        if (active) {
          setPenaltiesMap(map)
          setPenaltiesLoaded(true)
        }
      } catch {
        if (active) {
          setPenaltiesMap(new Map())
          setPenaltiesLoaded(true)
        }
      } finally {}
    })()
    return () => { active = false }
  }, [session.id])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [pRes, eRes, bRes] = await Promise.all([
          fetch('/api/penalties', { cache: 'no-store' }),
          fetch('/api/exclusions', { cache: 'no-store' }),
          fetch('/api/ballast', { cache: 'no-store' }),
        ])
        const toArray = (j: unknown) => Array.isArray(j) ? j : (j && typeof j === 'object' ? Object.values(j as Record<string, unknown>) : [])
        type Pen = { driverId: string; sessionId: string; seconds: number; confirmed?: boolean }
        type Excl = { driverId: string; sessionId: string; exclude: boolean; confirmed?: boolean }
        type Ball = { driverId: string; sessionId: string; kg: number; confirmed?: boolean }
        const isPen = (x: unknown): x is Pen => {
          if (!x || typeof x !== 'object') return false
          const o = x as { driverId?: unknown; sessionId?: unknown; seconds?: unknown; confirmed?: unknown }
          return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.seconds === 'number'
        }
        const isExcl = (x: unknown): x is Excl => {
          if (!x || typeof x !== 'object') return false
          const o = x as { driverId?: unknown; sessionId?: unknown; exclude?: unknown; confirmed?: unknown }
          return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.exclude === 'boolean'
        }
        const isBall = (x: unknown): x is Ball => {
          if (!x || typeof x !== 'object') return false
          const o = x as { driverId?: unknown; sessionId?: unknown; kg?: unknown; confirmed?: unknown }
          return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.kg === 'number'
        }
        const pList = pRes.ok ? toArray(await pRes.json()) : []
        const eList = eRes.ok ? toArray(await eRes.json()) : []
        const bList = bRes.ok ? toArray(await bRes.json()) : []
        const has = pList.filter(isPen).some((x) => x.sessionId === session.id && x.confirmed !== true) ||
          eList.filter(isExcl).some((x) => x.sessionId === session.id && x.confirmed !== true) ||
          bList.filter(isBall).some((x) => x.sessionId === session.id && x.confirmed !== true)
        if (active) {
          setHasDrafts(has)
        }
      } catch {
        if (active) setHasDrafts(false)
      }
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
        if (active) {
          setBallastAdjMap(map)
          setBallastLoaded(true)
        }
      } catch {
        if (active) {
          setBallastAdjMap(new Map())
          setBallastLoaded(true)
        }
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
  const ready = penaltiesLoaded && exclusionsLoaded && ballastLoaded
  if (!ready) {
    return (
      <div className="rounded-md border p-3 md:p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#d8552b]" />
      </div>
    )
  }
  return (
    <div className="rounded-md border p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base md:text-lg font-semibold">Resultados</h2>
        {isAdmin ? (
          <Button
            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40"
            disabled={loading || !hasDrafts}
            onClick={async () => {
              try {
                setLoading(true)
                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (adminToken) headers['x-admin-token'] = adminToken
                const [pRes, eRes, bRes] = await Promise.all([
                  fetch('/api/penalties', { cache: 'no-store' }),
                  fetch('/api/exclusions', { cache: 'no-store' }),
                  fetch('/api/ballast', { cache: 'no-store' }),
                ])
                const pList = pRes.ok ? await pRes.json() : []
                const eList = eRes.ok ? await eRes.json() : []
                const bList = bRes.ok ? await bRes.json() : []
                const toArray = (j: unknown) => Array.isArray(j) ? j : (j && typeof j === 'object' ? Object.values(j as Record<string, unknown>) : [])
                type Pen = { driverId: string; sessionId: string; seconds: number; confirmed?: boolean }
                type Excl = { driverId: string; sessionId: string; exclude: boolean; confirmed?: boolean }
                type Ball = { driverId: string; sessionId: string; kg: number; confirmed?: boolean }
                const isPen = (x: unknown): x is Pen => {
                  if (!x || typeof x !== 'object') return false
                  const o = x as { driverId?: unknown; sessionId?: unknown; seconds?: unknown; confirmed?: unknown }
                  return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.seconds === 'number'
                }
                const isExcl = (x: unknown): x is Excl => {
                  if (!x || typeof x !== 'object') return false
                  const o = x as { driverId?: unknown; sessionId?: unknown; exclude?: unknown; confirmed?: unknown }
                  return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.exclude === 'boolean'
                }
                const isBall = (x: unknown): x is Ball => {
                  if (!x || typeof x !== 'object') return false
                  const o = x as { driverId?: unknown; sessionId?: unknown; kg?: unknown; confirmed?: unknown }
                  return typeof o.driverId === 'string' && typeof o.sessionId === 'string' && typeof o.kg === 'number'
                }
                const pens = toArray(pList).filter(isPen).filter((x) => x.sessionId === session.id && x.confirmed !== true)
                const excls = toArray(eList).filter(isExcl).filter((x) => x.sessionId === session.id && x.confirmed !== true)
                const balls = toArray(bList).filter(isBall).filter((x) => x.sessionId === session.id && x.confirmed !== true)
                const tasks: Promise<Response>[] = []
                for (const p of pens) {
                  tasks.push(fetch('/api/penalties', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.id, driverId: p.driverId, seconds: p.seconds, confirmed: true }) }))
                }
                for (const e of excls) {
                  tasks.push(fetch('/api/exclusions', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.id, driverId: e.driverId, exclude: e.exclude, confirmed: true }) }))
                }
                for (const b of balls) {
                  tasks.push(fetch('/api/ballast', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.id, driverId: b.driverId, kg: b.kg, confirmed: true }) }))
                }
                await Promise.all(tasks)
                toast.success('Sesión publicada', { description: session.id })
                setHasDrafts(false)
                router.refresh()
              } catch {
                toast.error('No se pudo publicar sesión', { description: session.id })
              } finally {
                setLoading(false)
              }
            }}
          >
            Publicar sesión
          </Button>
        ) : null}
        
      </div>
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
                  <span className={`inline-flex items-center justify-center w-20 h-9 md:w-24 md:h-10 rounded-md ${r.position === 1 ? 'bg-linear-to-r from-[#e6c463] via-[#d4b24c] to-[#b9902e]' : 'bg-[#d8552b]'} text-white font-extrabold italic text-xl md:text-2xl`}>
                    {r.position}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-extrabold text-xl md:text-2xl uppercase italic ${
                      r.position === 1 ? 'bg-linear-to-r from-[#e6c463] via-[#d4b24c] to-[#b9902e] bg-clip-text text-transparent drop-shadow-sm' : ''
                    }`}
                  >
                    {d?.name ?? r.driverId}
                  </span>
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
                      <span className={`inline-flex items-center justify-center rounded-full border font-extrabold w-10 h-10 text-base md:w-12 md:h-12 md:text-lg ${positive ? 'border-[#d8552b] text-[#d8552b]' : 'border-[#9ca3af] text-[#9ca3af]'}`}>{val}</span>
                    )
                  })()}
                </TableCell>
                <TableCell>{(ballastAdjMap.get(r.driverId) ?? 0)} kg</TableCell>
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
                                const hdrs: Record<string, string> = { 'Content-Type': 'application/json' }
                                if (adminToken) hdrs['x-admin-token'] = adminToken
                                const res = await fetch('/api/penalties', {
                                  method: 'POST',
                                  headers: hdrs,
                                  body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, seconds: penaltySeconds, confirmed: false }),
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
                                setHasDrafts(true)
                                setLoading(false)
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
                                const hdrs2: Record<string, string> = { 'Content-Type': 'application/json' }
                                if (adminToken) hdrs2['x-admin-token'] = adminToken
                                const res = await fetch('/api/ballast', {
                                  method: 'POST',
                                  headers: hdrs2,
                                  body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, kg, confirmed: false }),
                                })
                                if (!res.ok) throw new Error('error')
                                toast.success('Lastre actualizado', { description: d?.name ?? r.driverId })
                                setOpenPenaltyFor(null)
                                setHasDrafts(true)
                                setLoading(false)
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
                                  const hdrs3: Record<string, string> = { 'Content-Type': 'application/json' }
                                  if (adminToken) hdrs3['x-admin-token'] = adminToken
                                  const res = await fetch('/api/exclusions', {
                                    method: 'POST',
                                    headers: hdrs3,
                                    body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, exclude: false, confirmed: false }),
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
                                    setHasDrafts(true)
                                    setLoading(false)
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
                                  const hdrs4: Record<string, string> = { 'Content-Type': 'application/json' }
                                  if (adminToken) hdrs4['x-admin-token'] = adminToken
                                  const res = await fetch('/api/exclusions', {
                                    method: 'POST',
                                    headers: hdrs4,
                                    body: JSON.stringify({ sessionId: session.id, driverId: r.driverId, exclude: true, confirmed: false }),
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
                                    setHasDrafts(true)
                                    setLoading(false)
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
                              
