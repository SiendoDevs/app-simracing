import type { Session } from '@/types/Session'

const RACE_POINTS = [25, 20, 18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1]

export function pointsForPosition(pos: number, type: string): number {
  if (type === 'QUALIFY') return pos === 1 ? 3 : 0
  return RACE_POINTS[pos - 1] ?? 0
}

export function applySessionPoints(session: Session): Session {
  const withPoints = session.results.map((r) => ({ ...r, points: r.dnf ? 0 : pointsForPosition(r.position, session.type) }))
  return { ...session, results: withPoints }
}

export function calculateChampionship(sessions: Session[]) {
  const totals = new Map<string, { driverId: string; name: string; points: number; races: number; wins: number; livery?: string; team?: string }>()
  for (const s of sessions) {
    const sWithPoints = applySessionPoints(s)
    for (const r of sWithPoints.results) {
      const d = s.drivers.find((x) => x.id === r.driverId)
      const name = d?.name ?? r.driverId
      const prev = totals.get(r.driverId) ?? { driverId: r.driverId, name, points: 0, races: 0, wins: 0, livery: undefined, team: d?.team }
      const winsAdd = s.type === 'RACE' && r.position === 1 ? 1 : 0
      const livery = r.skin ?? prev.livery
      const team = prev.team ?? d?.team
      totals.set(r.driverId, { driverId: r.driverId, name, points: prev.points + (r.points ?? 0), races: prev.races + (s.type === 'RACE' ? 1 : 0), wins: prev.wins + winsAdd, livery, team })
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.points - a.points)
}
