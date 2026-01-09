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
    <Card className="bg-gradient-to-br from-background to-green-500/10 border-green-500 relative overflow-hidden">
      <CardHeader>
        <CardTitle className='text-lg font-bold text-foreground flex items-center gap-3'>
          <div className="p-2 bg-gradient-to-br from-green-500/30 to-green-500/10 border border-green-500/20 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            <ChevronsUp className="h-6 w-6 text-green-500" />
          </div>
          Más Adelantamientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positiveBest ? (
          <div className="space-y-1">
            <div className="font-extrabold text-xl md:text-2xl uppercase italic text-green-500">{name}</div>
            <div className="text-3xl md:text-4xl font-bold text-foreground tracking-tighter">+{value}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}
