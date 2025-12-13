import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronsUp } from 'lucide-react'
import type { Session } from '@/types/Session'

export default function MostOvertakesCard({ session }: { session: Session }) {
  const entries = session.type === 'RACE' ? session.results.filter((r) => typeof r.gridPosition === 'number') : []
  const withDiff = entries.map((r) => ({ r, diff: (r.gridPosition! - r.position) }))
  const best = withDiff.sort((a, b) => b.diff - a.diff)[0]
  const positiveBest = best && best.diff > 0 ? best : undefined
  const name = positiveBest ? session.drivers.find((d) => d.id === positiveBest.r.driverId)?.name ?? positiveBest.r.driverId : undefined
  const value = positiveBest ? positiveBest.diff : undefined
  return (
    <Card className="bg-green-500/12 border-green-500/30">
      <CardHeader>
        <CardTitle className='text-lg font-bold text-green-600'>
          <span className="inline-flex items-center gap-2">
            <ChevronsUp className="h-5 w-5 text-green-600" />
            Más Adelantamientos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positiveBest ? (
          <div className="space-y-1">
            <div className="font-extrabold text-xl md:text-2xl uppercase italic">{name}</div>
            <div className="text-3xl md:text-4xl font-bold text-green-600 tracking-tighter">+{value}</div>
          </div>
        ) : (
          <div className="text-sm">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}
