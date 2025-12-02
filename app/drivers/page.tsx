import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import DriversTable from '@/components/DriversTable'
import DriverCompare from '@/components/DriverCompare'
import { loadExclusions, stripExcluded } from '@/lib/exclusions'

export default async function Page() {
  const sessions = await loadLocalSessions()
  const exclusions = loadExclusions()
  const adjusted = sessions.map((s) => stripExcluded(s, exclusions))
  const table = calculateChampionship(adjusted)
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-bold">Pilotos</h1>
      <DriversTable data={table} />
      <DriverCompare />
    </div>
  )
}
