import path from 'node:path'
import type { Session } from '@/types/Session'
import type { Driver } from '@/types/Driver'
import type { Car } from '@/types/Car'
import type { Lap } from '@/types/Lap'
import type { Incident } from '@/types/Incident'

function slugFromFile(filePath: string) {
  const base = path.basename(filePath, path.extname(filePath))
  const withNoPrefix = base.includes(":") ? base.split(":").pop() as string : base
  return withNoPrefix
}

function inferType(raw: Record<string, unknown>, filePath: string): string {
  const R = raw as Record<string, unknown>
  const t = R['sessionType'] ?? R['SessionType'] ?? R['type'] ?? R['Type']
  if (typeof t === 'string' && t.length > 0) return t.toUpperCase()
  const name = path.basename(filePath).toUpperCase()
  if (name.includes('RACE')) return 'RACE'
  if (name.includes('QUALIFY') || name.includes('QUALIFICATION')) return 'QUALIFY'
  if (name.includes('PRACTICE')) return 'PRACTICE'
  return 'RACE'
}

function toMs(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const v = value.trim()
    if (/^\d+$/.test(v)) return Number(v)
    const parts = v.split(':')
    if (parts.length === 3) {
      const [mm, ss, msRaw] = parts
      const ms = Number(msRaw.padEnd(3, '0'))
      return Number(mm) * 60_000 + Number(ss) * 1_000 + ms
    }
    if (parts.length === 2) {
      const [ss, msRaw] = parts
      const ms = Number(msRaw.padEnd(3, '0'))
      return Number(ss) * 1_000 + ms
    }
  }
  return undefined
}

export function parseSession(raw: Record<string, unknown>, sourceFilePath: string): Session {
  const id = slugFromFile(sourceFilePath)
  const type = inferType(raw, sourceFilePath)
  const R = raw as Record<string, unknown>
  const trackU = R['Track'] ?? R['TrackName'] ?? R['track'] ?? R['trackName']
  const track = typeof trackU === 'string' ? trackU : undefined
  const dateU = R['Date'] ?? R['date'] ?? R['sessionStart'] ?? R['SessionStart']
  const date = typeof dateU === 'string' ? dateU : undefined

  const cars: Car[] = []
  const driversMap = new Map<string, Driver>()
  const driverSkins = new Map<string, string>()
  const laps: Lap[] = []
  const maxSpeeds = new Map<string, number>()

  const carsU = R['Cars'] ?? R['cars']
  const resultU = R['Result'] ?? R['results']
  const carEntries: unknown[] = Array.isArray(carsU) ? (carsU as unknown[]) : Array.isArray(resultU) ? (resultU as unknown[]) : []

  for (const entryRaw of carEntries) {
    const E = entryRaw as Record<string, unknown>
    const modelU = E['CarModel'] ?? E['carModel'] ?? E['Car'] ?? E['car']
    const nameU = E['DriverName'] ?? E['Driver'] ?? E['driverName'] ?? E['driver']
    const steamU = E['SteamId'] ?? E['steamId'] ?? E['GUID'] ?? E['guid']
    const dObj = E['Driver'] as Record<string, unknown> | undefined
    const teamU = dObj && (typeof dObj['Team'] === 'string' ? dObj['Team'] : typeof dObj['team'] === 'string' ? dObj['team'] : undefined)
    const skinU = E['Skin'] ?? E['skin']
    const model: string = typeof modelU === 'string' ? modelU : 'Unknown'
    const nameFromObject: string | undefined = dObj && typeof dObj['Name'] === 'string' ? (dObj['Name'] as string) : undefined
    const name: string = typeof nameU === 'string' ? (nameU as string) : (nameFromObject ?? 'Unknown')
    const guidFromObject: string | undefined = dObj && typeof dObj['Guid'] === 'string' ? (dObj['Guid'] as string) : undefined
    const steamId: string | undefined = typeof steamU === 'string' ? (steamU as string) : guidFromObject
    const skin: string | undefined = typeof skinU === 'string' ? skinU : undefined
    const driverId = steamId || name
    const team = typeof teamU === 'string' && teamU.length > 0 ? teamU : undefined
    const prev = driversMap.get(driverId)
    if (!prev) {
      driversMap.set(driverId, { id: driverId, name, steamId, team })
    } else {
      driversMap.set(driverId, { ...prev, name: prev.name || name, steamId: prev.steamId ?? steamId, team: prev.team ?? team })
    }
    cars.push({ model, skin })
    if (skin) driverSkins.set(driverId, skin)
    const lapsListU = E['LapsList']
    if (Array.isArray(lapsListU)) {
      let n = 1
      for (const l of lapsListU as unknown[]) {
        const LR = l as Record<string, unknown>
        const timeMs = toMs(LR['LapTime'] ?? LR['time'])
        if (timeMs != null)
          laps.push({ lapNumber: n++, driverId, carModel: model, timeMs, cuts: (typeof LR['Cuts'] === 'number' ? (LR['Cuts'] as number) : undefined) ?? (typeof LR['cuts'] === 'number' ? (LR['cuts'] as number) : undefined), sectorTimesMs: Array.isArray(LR['Sectors']) ? (LR['Sectors'] as number[]) : Array.isArray(LR['sectors']) ? (LR['sectors'] as number[]) : undefined })
      }
    }
    const lapsU = E['laps']
    if (Array.isArray(lapsU)) {
      let n = 1
      for (const l of lapsU as unknown[]) {
        const LR = l as Record<string, unknown>
        const timeMs = toMs(LR['time'] ?? LR['lapTime'])
        if (timeMs != null)
          laps.push({ lapNumber: n++, driverId, carModel: model, timeMs, cuts: typeof LR['cuts'] === 'number' ? (LR['cuts'] as number) : undefined, sectorTimesMs: Array.isArray(LR['sectors']) ? (LR['sectors'] as number[]) : undefined })
      }
    }
  }

  const eventsU = R['Events'] ?? R['events']
  if (Array.isArray(eventsU)) {
    for (const e of eventsU as unknown[]) {
      const ER = e as Record<string, unknown>
      const dObj = ER['Driver'] as Record<string, unknown> | undefined
      const guid = dObj && typeof dObj['Guid'] === 'string' ? (dObj['Guid'] as string) : undefined
      const name = dObj && typeof dObj['Name'] === 'string' ? (dObj['Name'] as string) : undefined
      const driverId = guid || name
      const speed = typeof ER['ImpactSpeed'] === 'number' ? (ER['ImpactSpeed'] as number) : undefined
      if (driverId && typeof speed === 'number') {
        const prev = maxSpeeds.get(driverId) ?? 0
        if (speed > prev) maxSpeeds.set(driverId, speed)
      }
    }
  }

  const totalByDriver = new Map<string, number>()
  {
    const perDriver = new Map<string, number>()
    for (const l of laps) {
      if (l.timeMs != null && typeof l.driverId === 'string') {
        const prev = perDriver.get(l.driverId) ?? 0
        perDriver.set(l.driverId, prev + (l.timeMs as number))
      }
    }
    for (const [d, ms] of perDriver) totalByDriver.set(d, ms)
  }
  const resultsRaw: unknown[] = Array.isArray(resultU) ? (resultU as unknown[]) : carEntries
  const results = resultsRaw
    .map((rRaw, idx: number) => {
      const RR = rRaw as Record<string, unknown>
      const nameU = RR['DriverName'] ?? RR['Driver'] ?? RR['driverName'] ?? RR['driver']
      const steamU = RR['SteamId'] ?? RR['steamId'] ?? RR['GUID'] ?? RR['guid'] ?? RR['DriverGuid'] ?? RR['driverGuid']
      const dObj = RR['Driver'] as Record<string, unknown> | undefined
      const guidFromObject: string | undefined = dObj && typeof dObj['Guid'] === 'string' ? (dObj['Guid'] as string) : undefined
      const nameFromObject: string | undefined = dObj && typeof dObj['Name'] === 'string' ? (dObj['Name'] as string) : undefined
      const teamFromObject: string | undefined = dObj && typeof dObj['Team'] === 'string' ? (dObj['Team'] as string) : undefined
      let driverId: string = 'Unknown'
      if (typeof steamU === 'string') {
        const raw = steamU as string
        const tokens = raw.split(/[;,\s]+/).filter((t) => t.length > 0)
        const byMap = tokens.find((t) => driversMap.has(t))
        driverId = byMap ?? tokens[0] ?? 'Unknown'
      } else if (typeof guidFromObject === 'string') {
        driverId = guidFromObject
      } else if (typeof nameU === 'string') {
        driverId = nameU as string
      } else if (typeof nameFromObject === 'string') {
        driverId = nameFromObject
      }
      if (driverId) {
        const prev = driversMap.get(driverId)
        if (prev && !prev.team && teamFromObject && teamFromObject.length > 0) {
          driversMap.set(driverId, { ...prev, team: teamFromObject })
        }
      }
      const carU = RR['CarModel'] ?? RR['carModel'] ?? RR['Car'] ?? RR['car']
      const carModel: string = typeof carU === 'string' ? (carU as string) : 'Unknown'
      const skinU = RR['Skin'] ?? RR['skin']
      const skinRaw: string | undefined = typeof skinU === 'string' ? (skinU as string) : undefined
      const positionU = RR['Position'] ?? RR['position']
      const position: number = typeof positionU === 'number' ? (positionU as number) : idx + 1
      const parsedTotal = toMs(RR['TotalTime'] ?? RR['totalTime'])
      const totalTimeMs = typeof parsedTotal === 'number' ? parsedTotal : (totalByDriver.get(driverId) ?? undefined)
      const bestLapMs = toMs(RR['BestLap'] ?? RR['bestLap'] ?? RR['BestLapTime'] ?? RR['bestLapTime'])
      const lapsCompleted =
        typeof RR['NumLaps'] === 'number' ? (RR['NumLaps'] as number) :
        typeof RR['Laps'] === 'number' ? (RR['Laps'] as number) :
        typeof RR['laps'] === 'number' ? (RR['laps'] as number) :
        undefined
      const gridRaw = RR['GridPosition'] ?? RR['gridPosition']
      const gridPosition = typeof gridRaw === 'number' ? (gridRaw as number) : undefined
      const skin = skinRaw ?? driverSkins.get(driverId)
      const maxSpeedKmh = maxSpeeds.get(driverId)
      return { position, driverId, carModel, skin, totalTimeMs, bestLapMs, lapsCompleted, maxSpeedKmh, gridPosition }
    })
    .sort((a, b) => a.position - b.position)

  const incidentsRaw: unknown[] = Array.isArray(R['Incidents']) ? (R['Incidents'] as unknown[]) : Array.isArray(R['incidents']) ? (R['incidents'] as unknown[]) : []
  const incidents: Incident[] = incidentsRaw.map((iRaw) => {
    const I = iRaw as Record<string, unknown>
    const typeU = I['Type'] ?? I['type']
    const type: string = typeof typeU === 'string' ? (typeU as string) : 'Unknown'
    const lapNumber = typeof I['Lap'] === 'number' ? (I['Lap'] as number) : typeof I['lap'] === 'number' ? (I['lap'] as number) : undefined
    const driverId: string | undefined = typeof I['DriverId'] === 'string' ? (I['DriverId'] as string) : typeof I['driverId'] === 'string' ? (I['driverId'] as string) : undefined
    const otherDriverId: string | undefined = typeof I['OtherDriverId'] === 'string' ? (I['OtherDriverId'] as string) : typeof I['otherDriverId'] === 'string' ? (I['otherDriverId'] as string) : undefined
    const description: string | undefined = typeof I['Description'] === 'string' ? (I['Description'] as string) : typeof I['description'] === 'string' ? (I['description'] as string) : undefined
    const timeMs = toMs(I['Time'] ?? I['time'])
    return { type, lapNumber, driverId, otherDriverId, description, timeMs }
  })

  return {
    id,
    type: type as Session['type'],
    date,
    track,
    cars,
    drivers: Array.from(driversMap.values()),
    laps,
    incidents,
    results,
    sourceFilePath: sourceFilePath,
  }
}
