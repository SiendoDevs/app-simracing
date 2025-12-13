import { resolveSkinImageFor } from '@/lib/skins'
import type { ChampionshipRow } from '@/components/ChampionshipTable'
import TopThreeCard from '@/components/TopThreeCard'

export default function TopThreeChampionship({ data }: { data: ChampionshipRow[] }) {
  const top3 = data.slice(0, 3)
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
      {top3.map((row, idx) => {
        const previewUrl = resolveSkinImageFor(row.livery, row.name)
        return (
          <TopThreeCard
            key={row.driverId}
            name={row.name}
            idx={idx}
            previewUrl={previewUrl}
          />
        )
      })}
    </div>
  )
}
