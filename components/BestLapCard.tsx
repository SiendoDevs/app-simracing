import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer } from 'lucide-react'
import type { Session } from '@/types/Session'

export default function BestLapCard({ session }: { session: Session }) {
  const best = session.results
    .filter((r) => r.bestLapMs != null)
    .sort((a, b) => (a.bestLapMs! - b.bestLapMs!))[0]
  const name = best ? session.drivers.find((d) => d.id === best.driverId)?.name ?? best.driverId : undefined
  return (
    <Card className="bg-brand-animated border-[#d8552b]">
      <CardHeader>
        <CardTitle className='text-lg font-bold text-black'>
          <span className="inline-flex items-center gap-2">
            <Timer className="h-5 w-5 text-black" />
            Mejor Vuelta
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {best ? (
          <div className="space-y-1">
            <div className="font-extrabold text-xl md:text-2xl uppercase italic text-white">{name}</div>
            <div className="text-3xl md:text-4xl font-bold text-black tracking-tighter">{(best.bestLapMs! / 1000).toFixed(3)}s</div>
          </div>
        ) : (
          <div className="text-sm text-black">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}
