export interface Lap {
  lapNumber: number
  driverId: string
  carModel: string
  timeMs: number
  cuts?: number
  sectorTimesMs?: number[]
  timestamp?: number
}

