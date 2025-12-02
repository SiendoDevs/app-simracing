import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import ChampionshipTable from '@/components/ChampionshipTable'
import { Progress } from '@/components/ui/progress'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
 

export default async function Page() {
  const sessions = await loadLocalSessions()
  const exclusionsRemote = await (async () => {
    try {
      const res = await fetch('/api/exclusions', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j
      }
    } catch {}
    return null
  })()
  const exclusions = exclusionsRemote ?? []
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
  const adjusted = sessions
    .map((s) => applyDnfByLaps(s))
    .map((s) => applyPenaltiesToSession(s, penalties))
    .map((s) => stripExcluded(s, exclusions))
  const table = calculateChampionship(adjusted)
  const manualRemote = await (async () => {
    try {
      const res = await fetch('/api/ballast', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j as Array<{ driverId: string; sessionId: string; kg: number }>
      }
    } catch {}
    return null
  })()
  const manual = manualRemote ?? []
  const ballastMap = (() => {
    const map = new Map<string, number>()
    const relevant = sessions.filter((s) => s.type.toUpperCase() === 'RACE')
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
    const groups = new Map<string, typeof relevant>()
    for (const s of relevant) {
      const k = sessionDateKey(s)
      const arr = groups.get(k) ?? []
      arr.push(s)
      groups.set(k, arr)
    }
    const order = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))
    let pendingReset = new Set<string>()
    const pendingMinus = new Map<string, number>()
    const pendingPlus = new Map<string, number>()
    for (const key of order) {
      const list = (groups.get(key) ?? []).sort((a, b) => a.id.localeCompare(b.id))
      for (const s of list) {
        const set = new Set<string>(exclusions.filter((e) => e.sessionId === s.id && e.exclude).map((e) => e.driverId))
        const nonExcluded = s.results.filter((r) => !set.has(r.driverId))
        const finishers = nonExcluded.filter((r) => !r.dnf)
          .sort((a, b) => {
            const la = a.lapsCompleted ?? 0
            const lb = b.lapsCompleted ?? 0
            if (la !== lb) return lb - la
            const ta = a.totalTimeMs
            const tb = b.totalTimeMs
            if (ta != null && tb != null) return ta - tb
            if (ta != null) return -1
            if (tb != null) return 1
            return (a.position ?? 0) - (b.position ?? 0)
          })
          .map((r, idx) => ({ ...r, position: idx + 1 }))
        const dnfs = nonExcluded.filter((r) => r.dnf)
        for (const r of finishers) {
          if (r.position === 1) {
            const prev = pendingPlus.get(r.driverId) ?? 0
            pendingPlus.set(r.driverId, prev + 5)
          } else if (r.position >= 4) {
            pendingReset.add(r.driverId)
          }
        }
        for (const r of dnfs) {
          const prev = pendingMinus.get(r.driverId) ?? 0
          pendingMinus.set(r.driverId, prev + 5)
        }
        for (const b of manual) {
          if (b.sessionId === s.id) {
            const curr = map.get(b.driverId) ?? 0
            map.set(b.driverId, curr + Math.max(0, Math.floor(b.kg)))
          }
        }
      }
      for (const d of pendingReset) {
        map.set(d, 0)
      }
      for (const [d, mval] of pendingMinus) {
        const curr = map.get(d) ?? 0
        map.set(d, Math.max(0, curr - mval))
      }
      for (const [d, pval] of pendingPlus) {
        const curr = map.get(d) ?? 0
        // Si hubo reset en esta fecha, ya está en 0 para la próxima, no sumamos
        if (!pendingReset.has(d)) map.set(d, curr + pval)
      }
      pendingReset = new Set<string>()
      pendingMinus.clear()
      pendingPlus.clear()
    }
    return map
  })()
  const relevant = sessions.filter((s) => {
    const t = s.type.toUpperCase()
    return t === 'RACE' || t === 'QUALIFY'
  })
  const plannedCounts = [3, 3, 3, 2, 3, 3, 2, 2]
  const totalFechas = plannedCounts.length
  let remaining = relevant.length
  let fechasCompletas = 0
  let parcial = 0
  for (let i = 0; i < plannedCounts.length; i++) {
    const need = plannedCounts[i]
    if (remaining >= need) {
      fechasCompletas++
      remaining -= need
    } else {
      parcial = need > 0 ? remaining / need : 0
      break
    }
  }
  const progressValue = Math.round(((fechasCompletas + parcial) / totalFechas) * 100)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Campeonato</h1>
      <div className="space-y-1">
        <Progress value={progressValue} />
        <div className="text-xs text-muted-foreground">{fechasCompletas}/{totalFechas} fechas</div>
      </div>
      <ChampionshipTable data={table.map((row) => ({ ...row, ballastKg: ballastMap.get(row.driverId) ?? 0 }))} />
    </div>
  )
}
