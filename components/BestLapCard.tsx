import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Timer } from 'lucide-react'
import type { Session } from '@/types/Session'

export default function BestLapCard({ session }: { session: Session }) {
  const best = session.results
    .filter((r) => r.bestLapMs != null)
    .sort((a, b) => (a.bestLapMs! - b.bestLapMs!))[0]
  const name = best ? session.drivers.find((d) => d.id === best.driverId)?.name ?? best.driverId : undefined
  return (
    <Card className="bg-linear-to-br from-background to-[#d8552b]/10 border-[#d8552b] relative overflow-hidden">
      <CardHeader>
        <CardTitle className='text-lg font-bold text-foreground flex items-center gap-3'>
          <div className="p-2 bg-linear-to-br from-[#d8552b]/30 to-[#d8552b]/10 border border-[#d8552b]/20 rounded-lg shadow-[0_0_15px_rgba(216,85,43,0.15)]">
             <Timer className="h-6 w-6 text-[#d8552b]" />
          </div>
          Mejor Vuelta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {best ? (
          <div className="space-y-1">
            <div className="font-extrabold text-xl md:text-2xl uppercase italic text-[#d8552b]">{name}</div>
            <div className="text-3xl md:text-4xl font-bold text-foreground tracking-tighter">{(best.bestLapMs! / 1000).toFixed(3)}s</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Sin datos</div>
        )}
      </CardContent>
    </Card>
  )
}
