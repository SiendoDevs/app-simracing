import type { Session } from '@/types/Session'

const RACE_POINTS = [25, 20, 18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1]

export function pointsForPosition(pos: number, type: string, custom?: number[] | string): number {
  const arr = (() => {
    if (typeof custom === 'string') {
      const tokens = custom.split(/[\s,]+/).map((t) => t.trim()).filter((t) => t.length > 0)
      const nums = tokens.map((t) => Number(t)).filter((n) => Number.isFinite(n) && n >= 0)
      return nums
    }
    return Array.isArray(custom) ? custom : undefined
  })()
  if (Array.isArray(arr) && arr.length > 0) return arr[pos - 1] ?? 0
  if ((type || '').toUpperCase() === 'QUALIFY') return pos === 1 ? 3 : 0
  return RACE_POINTS[pos - 1] ?? 0
}

export function applySessionPoints(session: Session, custom?: number[] | string): Session {
  const withPoints = session.results.map((r) => ({ ...r, points: r.dnf ? 0 : pointsForPosition(r.position, session.type, custom) }))
  return { ...session, results: withPoints }
}

export function calculateChampionship(sessions: Session[], customBySession?: Map<string, number[] | string>) {
  const totals = new Map<string, {
    driverId: string
    name: string
    points: number
    races: number
    wins: number
    podiums: number
    top5: number
    top10: number
    sumPositions: number
    totalLaps: number
    livery?: string
    team?: string
    country?: string
    city?: string
    age?: number
  }>()

  for (const s of sessions) {
    const custom = customBySession?.get(s.id)
    const sWithPoints = applySessionPoints(s, custom)
    for (const r of sWithPoints.results) {
      const d = s.drivers.find((x) => x.id === r.driverId)
      const name = d?.name ?? r.driverId
      const prev = totals.get(r.driverId) ?? {
        driverId: r.driverId,
        name,
        points: 0,
        races: 0,
        wins: 0,
        podiums: 0,
        top5: 0,
        top10: 0,
        sumPositions: 0,
        totalLaps: 0,
        livery: undefined,
        team: d?.team,
        country: d?.country,
        city: d?.city,
        age: d?.age
      }

      const isRace = s.type === 'RACE'
      const winsAdd = isRace && r.position === 1 ? 1 : 0
      const podiumsAdd = isRace && r.position <= 3 ? 1 : 0
      const top5Add = isRace && r.position <= 5 ? 1 : 0
      const top10Add = isRace && r.position <= 10 ? 1 : 0
      const lapsAdd = r.lapsCompleted ?? 0
      const positionAdd = isRace ? r.position : 0
      
      const livery = r.skin ?? prev.livery
      const team = prev.team ?? d?.team
      const country = prev.country ?? d?.country
      const city = prev.city ?? d?.city
      const age = prev.age ?? d?.age

      totals.set(r.driverId, {
        driverId: r.driverId,
        name,
        points: prev.points + (r.points ?? 0),
        races: prev.races + (isRace ? 1 : 0),
        wins: prev.wins + winsAdd,
        podiums: prev.podiums + podiumsAdd,
        top5: prev.top5 + top5Add,
        top10: prev.top10 + top10Add,
        sumPositions: prev.sumPositions + positionAdd,
        totalLaps: prev.totalLaps + lapsAdd,
        livery,
        team,
        country,
        city,
        age
      })
    }
  }

  return Array.from(totals.values()).map(t => ({
    ...t,
    avgPosition: t.races > 0 ? Number((t.sumPositions / t.races).toFixed(2)) : 0
  })).sort((a, b) => b.points - a.points)
}
