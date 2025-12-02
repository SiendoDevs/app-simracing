import fs from 'node:fs'
import path from 'node:path'
import type { Session } from '@/types/Session'

export type Exclusion = {
  driverId: string
  sessionId: string
  exclude: boolean
}

const FILE = path.resolve(process.cwd(), 'exclusions.json')

export function loadExclusions(): Exclusion[] {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) return data as Exclusion[]
    }
  } catch {}
  return []
}

export function saveExclusion(e: Exclusion): void {
  const list = loadExclusions()
  const idx = list.findIndex((x) => x.driverId === e.driverId && x.sessionId === e.sessionId)
  if (idx >= 0) list[idx] = e
  else list.push(e)
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}

export function applyExclusionsToSession(session: Session, exclusions: Exclusion[]): Session {
  if ((session.type || '').toUpperCase() === 'QUALIFY') return session
  const sid = session.id
  const set = new Set<string>(
    exclusions
      .filter((e) => e.exclude && e.sessionId === sid)
      .map((e) => e.driverId)
  )
  if (set.size === 0) return session
  const nonExcluded = session.results.filter((r) => !set.has(r.driverId))
  const excluded = session.results.filter((r) => set.has(r.driverId))
  const reassigned = nonExcluded.map((r, idx) => ({ ...r, position: idx + 1 }))
  const appended = excluded.map((r, idx) => ({ ...r, dnf: true, position: reassigned.length + idx + 1 }))
  return { ...session, results: [...reassigned, ...appended] }
}

export function stripExcluded(session: Session, exclusions: Exclusion[]): Session {
  if ((session.type || '').toUpperCase() === 'QUALIFY') return session
  const sid = session.id
  const set = new Set<string>(
    exclusions
      .filter((e) => e.exclude && e.sessionId === sid)
      .map((e) => e.driverId)
  )
  if (set.size === 0) return session
  const nonExcluded = session.results.filter((r) => !set.has(r.driverId))
  const reassigned = nonExcluded.map((r, idx) => ({ ...r, position: idx + 1 }))
  return { ...session, results: reassigned }
}
