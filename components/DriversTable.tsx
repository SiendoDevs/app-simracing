 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { resolveSkinNumber } from '@/lib/skins'
import Link from 'next/link'

export interface DriverRow {
  driverId: string
  name: string
  points: number
  penaltySeconds?: number
  absences?: number
  races: number
  wins: number
  podiums: number
  top5: number
  top10: number
  avgPosition: number
  totalLaps: number
  livery?: string
  team?: string
  country?: string
  city?: string
  age?: number
  previewUrl?: string
  numberToken?: string
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
            <TableHead>Nacionalidad</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Edad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, idx) => (
            <TableRow
              key={d.driverId}
              className={`${idx === 0 ? 'bg-[#d8552b]/20 hover:bg-transparent' : idx === 1 ? 'bg-[#d8552b]/12 hover:bg-transparent' : idx === 2 ? 'bg-[#d8552b]/6 hover:bg-transparent' : ''}` }
            >
              <TableCell>
                <span className="inline-flex items-center justify-center w-20 h-9 md:w-24 md:h-10 rounded-md bg-[#d8552b] text-white font-extrabold italic text-xl md:text-2xl">
                  {resolveSkinNumber(d.livery, d.name) ?? idx + 1}
                </span>
              </TableCell>
              <TableCell>
                <Link href={`/driver-profile/${d.driverId}`} className="hover:opacity-80 transition-opacity">
                  <span
                    className={`font-extrabold text-xl md:text-2xl uppercase italic ${
                      idx === 0 ? 'bg-linear-to-r from-[#e6c463] via-[#d4b24c] to-[#b9902e] bg-clip-text text-transparent drop-shadow-sm' : ''
                    }`}
                  >
                    {d.name}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-sm md:text-base font-semibold text-[#9ca3af]">{d.team ?? '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm md:text-base font-semibold text-[#9ca3af]">
                  {d.country ?? '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm md:text-base font-semibold text-[#9ca3af]">
                  {d.city ?? '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm md:text-base font-semibold text-[#9ca3af]">
                  {typeof d.age === 'number' ? d.age : '-'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
