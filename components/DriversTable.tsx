 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { resolveSkinNumber } from '@/lib/skins'
import { Trophy } from 'lucide-react'
 

export interface DriverRow {
  driverId: string
  name: string
  points: number
  races: number
  wins: number
  livery?: string
  team?: string
}

export default function DriversTable({ data }: { data: DriverRow[] }) {
  return (
    <div className="rounded-md border p-4">
      <h2 className="text-lg font-semibold"></h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Piloto</TableHead>
            <TableHead>Equipo</TableHead>
            <TableHead>Puntos</TableHead>
            <TableHead className="text-center">Carreras</TableHead>
            <TableHead>Victorias</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, idx) => (
            <TableRow
              key={d.driverId}
              className={`${idx === 0 ? 'bg-[#d8552b]/20 hover:bg-transparent' : idx === 1 ? 'bg-[#d8552b]/12 hover:bg-transparent' : idx === 2 ? 'bg-[#d8552b]/6 hover:bg-transparent' : ''}` }
            >
              <TableCell>
                <span className="inline-flex items-center justify-center w-20 h-8 rounded-md bg-[#d8552b] text-white font-bold text-lg">
                  {resolveSkinNumber(d.livery, d.name) ?? idx + 1}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-bold text-base">{d.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-[#9ca3af]">{d.team ?? '-'}</span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center justify-center rounded-full border font-bold w-12 h-9 text-base ${
                    d.points > 0 ? 'border-[#d8552b] text-[#d8552b]' : 'border-[#9ca3af] text-[#9ca3af]'
                  }`}
                >
                  {String(d.points).padStart(3, '0')}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-base text-[#9ca3af]">{d.races}</span>
              </TableCell>
              <TableCell className="align-middle">
                <div className="h-8 flex items-center gap-1">
                  {Array.from({ length: d.wins }).map((_, i) => (
                    <Trophy key={i} className="h-4 w-4 text-[#d8552b]" />
                  ))}
                </div>
              </TableCell>
              
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
