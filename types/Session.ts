import type { Driver } from './Driver'
import type { Car } from './Car'
import type { Lap } from './Lap'
import type { Incident } from './Incident'

export interface SessionResultEntry {
  position: number
  driverId: string
  carModel: string
  skin?: string
  totalTimeMs?: number
  bestLapMs?: number
  lapsCompleted?: number
  points?: number
  maxSpeedKmh?: number
  gridPosition?: number
  dnf?: boolean
  
}

export interface Session {
  id: string
  type: 'RACE' | 'QUALIFY' | 'PRACTICE' | string
  date?: string
  track?: string
  cars: Car[]
  drivers: Driver[]
  laps: Lap[]
  incidents: Incident[]
  results: SessionResultEntry[]
  sourceFilePath: string
}
