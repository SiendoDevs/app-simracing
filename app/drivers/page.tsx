import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import DriversTable from '@/components/DriversTable'
import DriverCompare from '@/components/DriverCompare'
import { loadExclusions, stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { loadPenalties, applyPenaltiesToSession } from '@/lib/penalties'

export default async function Page() {
  const sessions = await loadLocalSessions()
  const origin = (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0)
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'http://localhost:3000'
  const exclusionsRemote = await (async () => {
    try {
      const res = await fetch(`${origin}/api/exclusions`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const exclusions = exclusionsRemote ?? loadExclusions()
  const penaltiesRemote = await (async () => {
    try {
      const res = await fetch(`${origin}/api/penalties`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        if (Array.isArray(j)) return j
      }
    } catch {}
    return null
  })()
  const penalties = penaltiesRemote ?? loadPenalties()
  const adjusted = sessions
    .map((s) => applyDnfByLaps(s))
    .map((s) => applyPenaltiesToSession(s, penalties))
    .map((s) => stripExcluded(s, exclusions))
  const table = calculateChampionship(adjusted)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Pilotos</h1>
      <DriversTable data={table} />
      <DriverCompare />
    </div>
  )
}
