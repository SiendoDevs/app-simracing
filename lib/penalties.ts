import fs from 'node:fs'
import path from 'node:path'
import type { Session } from '@/types/Session'

export type Penalty = {
  driverId: string
  sessionId: string
  seconds: number
}

const FILE = path.resolve(process.cwd(), 'penalties.json')

export function loadPenalties(): Penalty[] {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) return data as Penalty[]
    }
  } catch {}
  return []
}

export function savePenalty(p: Penalty): void {
  const list = loadPenalties()
  const idx = list.findIndex((x) => x.driverId === p.driverId && x.sessionId === p.sessionId)
  if (p.seconds <= 0) {
    if (idx >= 0) list.splice(idx, 1)
  } else {
    if (idx >= 0) list[idx] = p
    else list.push(p)
  }
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}

export function applyPenaltiesToSession(session: Session, penalties: Penalty[]): Session {
  const byDriver = new Map<string, number>()
  for (const p of penalties) {
    if (p.sessionId === session.id) {
      const prev = byDriver.get(p.driverId) ?? 0
      byDriver.set(p.driverId, prev + p.seconds)
    }
  }
  if (byDriver.size === 0) return session
  if (session.type.toUpperCase() === 'RACE') {
    const finishers = session.results.filter((r) => !r.dnf)
    const dnfs = session.results.filter((r) => r.dnf)
    const adjusted = finishers
      .map((r) => {
        const sec = byDriver.get(r.driverId) ?? 0
        const addMs = Math.max(0, Math.floor(sec * 1000))
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
      .map((r, idx) => ({ ...r, position: idx + 1 }))
    const appended = dnfs.map((r, idx) => ({ ...r, position: adjusted.length + idx + 1 }))
    return { ...session, results: [...adjusted, ...appended] }
  } else {
    const adjusted = session.results
      .map((r) => {
        const sec = byDriver.get(r.driverId) ?? 0
        const addMs = Math.max(0, Math.floor(sec * 1000))
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
      .map((r, idx) => ({ ...r, position: idx + 1 }))
    return { ...session, results: adjusted }
  }
}
