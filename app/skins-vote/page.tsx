import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { calculateChampionship } from '@/lib/calculatePoints'
import { stripExcluded } from '@/lib/exclusions'
import { applyDnfByLaps } from '@/lib/utils'
import { applyPenaltiesToSession } from '@/lib/penalties'
import { resolveSkinImage } from '@/lib/skins'
import VoteSkinCard from '@/components/VoteSkinCard'
import TopThreeCard from '@/components/TopThreeCard'
import { Card } from '@/components/ui/card'
import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { currentChampionship } from '@/data/championships'
import { createRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page() {
  const sessions = await loadLocalSessions()
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
  const sessionsInRange = sessions.filter((s) => {
    const key = sessionDateKey(s)
    if (key === 'Sin-fecha') return false
    if (key < currentChampionship.startDate) return false
    if (currentChampionship.endDate && key > currentChampionship.endDate) return false
    return true
  })
  const adjusted = sessionsInRange
    .map((s) => applyDnfByLaps(s))
    .map((s) => applyPenaltiesToSession(s, []))
    .map((s) => stripExcluded(s, []))
  const table = calculateChampionship(adjusted)
  const user = await currentUser().catch(() => null)
  const redis = createRedis()
  const key = `skin_votes:${currentChampionship.id}`
  let votes: Record<string, number> = {}
  let mySelection: string | null = null
  try {
    const j = await redis.json.get(key)
    if (j && typeof j === 'object') {
      const obj = j as Record<string, unknown>
      const counts = obj['counts']
      const users = obj['users']
      votes = (counts && typeof counts === 'object') ? (counts as Record<string, number>) : (obj as Record<string, number>)
      if (user?.id && users && typeof users === 'object') {
        const m = users as Record<string, string>
        mySelection = m[user.id] ?? null
      }
    } else {
      const s = await redis.get(key)
      if (typeof s === 'string') {
        const parsed = JSON.parse(s) as Record<string, unknown>
        const counts = parsed['counts']
        const users = parsed['users']
        votes = (counts && typeof counts === 'object') ? (counts as Record<string, number>) : (parsed as Record<string, number>)
        if (user?.id && users && typeof users === 'object') {
          const m = users as Record<string, string>
          mySelection = m[user.id] ?? null
        }
      }
    }
  } catch {}
  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mejor Livery del Campeonato</h1>
        <div className="text-sm text-muted-foreground">
          <Link href="/championship" className="underline">Volver al campeonato</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {(() => {
          const sorted = table
            .slice()
            .sort((a, b) => Math.max(0, Math.floor(votes[b.driverId] ?? 0)) - Math.max(0, Math.floor(votes[a.driverId] ?? 0)))
          const topWithVotes = sorted
            .map((row) => ({ row, count: Math.max(0, Math.floor(votes[row.driverId] ?? 0)) }))
            .filter((x) => x.count > 0)
            .slice(0, 3)
          return [0, 1, 2].map((idx) => {
            const item = topWithVotes[idx]
            const borderClass = idx === 0 ? 'border-[#b9902e]' : idx === 1 ? 'border-[#a9b0b8]' : 'border-[#8c5a2d]'
            if (item) {
              const previewUrl = resolveSkinImage(item.row.livery)
              return (
                <TopThreeCard
                  key={item.row.driverId}
                  name={item.row.name}
                  idx={idx}
                  previewUrl={previewUrl}
                  count={item.count}
                />
              )
            }
            return <Card key={`placeholder-${idx}`} className={`relative overflow-hidden aspect-video ${borderClass}`} />
          })
        })()}
      </div>
      <div className="rounded-lg border p-3 md:p-4 text-sm text-muted-foreground">
        Elegí tu skin favorita del campeonato. Un voto por cuenta registrada.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {table.map((row) => {
          const previewUrl = resolveSkinImage(row.livery)
          const count = Math.max(0, Math.floor(votes[row.driverId] ?? 0))
          const disabled = !!mySelection
          return (
            <VoteSkinCard
              key={row.driverId}
              driverId={row.driverId}
              name={row.name}
              team={row.team}
              previewUrl={previewUrl}
              initialCount={count}
              disabled={disabled}
            />
          )
        })}
      </div>
    </div>
  )
}
