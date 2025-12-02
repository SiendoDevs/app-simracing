import fs from 'node:fs'
import path from 'node:path'

export type BallastAdj = {
  driverId: string
  sessionId: string
  kg: number
}

const FILE = path.resolve(process.cwd(), 'ballast.json')

export function loadBallast(): BallastAdj[] {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) return data as BallastAdj[]
      if (data && typeof data === 'object') {
        const arr = Object.values(data as Record<string, unknown>)
        return arr.filter((x) => x && typeof x === 'object') as BallastAdj[]
      }
    }
  } catch {}
  return []
}

export function saveBallast(b: BallastAdj): void {
  const list = loadBallast()
  const idx = list.findIndex((x) => x.driverId === b.driverId && x.sessionId === b.sessionId)
  if (b.kg <= 0) {
    if (idx >= 0) list.splice(idx, 1)
  } else {
    if (idx >= 0) list[idx] = b
    else list.push(b)
  }
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}
