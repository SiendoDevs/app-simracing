import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer } from 'lucide-react'
import type { Session } from '@/types/Session'

export default function BestLapCard({ session }: { session: Session }) {
  const best = session.results
    .filter((r) => r.bestLapMs != null)
    .sort((a, b) => (a.bestLapMs! - b.bestLapMs!))[0]
  const name = best ? session.drivers.find((d) => d.id === best.driverId)?.name ?? best.driverId : undefined
  return (
    <Card className="bg-[#d8552b]/12 border-[#d8552b]/30">
      <CardHeader>
        <CardTitle className='text-lg font-bold text-[#d8552b]'>
          <span className="inline-flex items-center gap-2">
            <Timer className="h-5 w-5 text-[#d8552b]" />
            Mejor Vuelta
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {best ? (
          <div className="space-y-1">
            <div className="font-extrabold text-xl md:text-2xl uppercase italic">{name}</div>
            <div className="text-xl font-bold text-[#d8552b]">{(best.bestLapMs! / 1000).toFixed(3)}s</div>
          </div>
        ) : (
          <div className="text-sm">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}
