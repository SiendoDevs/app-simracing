import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import DriversTable from '@/components/DriversTable'
import DriverCompare from '@/components/DriverCompare'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  const sessions = await loadLocalSessions()
  const origin = (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0)
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'http://localhost:3000'
  const exclusionsRemote = await (async () => {
    try {
      const res1 = await fetch('/api/exclusions', { cache: 'no-store' })
      if (res1.ok) {
        const j = await res1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const res2 = await fetch(`${origin}/api/exclusions`, { cache: 'no-store' })
      if (res2.ok) {
        const j = await res2.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    return null
  })()
  const exclusions = exclusionsRemote ?? []
  console.log('[drivers/page] exclusions count', Array.isArray(exclusionsRemote) ? exclusionsRemote.length : (exclusionsRemote ? Object.keys(exclusionsRemote as Record<string, unknown>).length : 0))
  const penaltiesRemote = await (async () => {
    try {
      const r1 = await fetch('/api/penalties', { cache: 'no-store' })
      if (r1.ok) {
        const j = await r1.json()
        if (Array.isArray(j)) return j
        if (j && typeof j === 'object') return Object.values(j as Record<string, unknown>)
      }
    } catch {}
    try {
      const r2 = await fetch(`${origin}/api/penalties`, { cache: 'no-store' })
      if (r2.ok) {
        const j = await r2.json()
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
  try {
    const qual = adjusted.filter((s) => s.type.toUpperCase() === 'QUALIFY')
    const sample = qual.slice(0, 2).map((s) => ({ id: s.id, top: s.results.slice(0, 3).map((r) => ({ driverId: r.driverId, pos: r.position })) }))
    console.log('[drivers/page] sample qual sessions', sample)
  } catch {}
  const table = calculateChampionship(adjusted)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Pilotos</h1>
      <DriversTable data={table} />
      <DriverCompare />
    </div>
  )
}
