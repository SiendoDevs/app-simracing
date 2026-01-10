import { Trophy, Timer } from 'lucide-react'
import { niceTrack } from '@/lib/formatters'

interface Win {
  id: string
  type: string
  track?: string
  position?: number
}

export default function TrophyCollection({ wins }: { wins: Win[] }) {
  if (wins.length === 0) return null

  return (
    <div className="rounded-md border p-4 bg-background">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#d8552b]" />
        Colección de Trofeos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wins.map((win) => {
          const isPole = win.type.toUpperCase() === 'QUALIFY'
          const isChamp = win.type.toUpperCase() === 'CHAMPIONSHIP'
          const Icon = isPole ? Timer : Trophy
          const label = isPole ? 'Pole Position' : isChamp ? 'Campeonato' : 'Victoria'
          const color = isPole ? '#8b5cf6' : isChamp ? '#FFD700' : '#cd7f32' // Violet for Pole, Gold for Champ, Bronze for Win
          return (
            <div 
              key={win.id} 
              className="flex items-center gap-3 p-3 rounded-lg border transition-colors"
              style={{ 
                background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
                borderColor: `${color}30`
              }}
            >
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate" title={niceTrack(win.track)}>{niceTrack(win.track)}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
