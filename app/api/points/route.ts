import { NextResponse } from 'next/server'
import { readRedisItems, writeRedisCollection } from '@/lib/redis'

export const runtime = 'nodejs'

type Entry = { sessionId: string; points: number[]; confirmed?: boolean }

export async function GET() {
  try {
    const items = await readRedisItems('points')
    return NextResponse.json(items)
  } catch {}
  return NextResponse.json([])
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as Partial<Entry> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const pointsArr = Array.isArray(body.points) ? body.points.filter((n) => Number.isFinite(n) && n >= 0).map((n) => Math.floor(n)) : []
    const confirmed = body.confirmed === true
    if (!sessionId) return NextResponse.json({ error: 'invalid_fields' }, { status: 400 })
    const items = await readRedisItems('points')
    const list: Entry[] = items.filter((x) => x && typeof x === 'object') as Entry[]
    const idx = list.findIndex((x) => x.sessionId === sessionId)
    if (pointsArr.length === 0 && confirmed) {
      if (idx >= 0) list.splice(idx, 1)
    } else {
      const entry: Entry = { sessionId, points: pointsArr, confirmed }
      if (idx >= 0) list[idx] = entry
      else list.push(entry)
    }
    const wr = await writeRedisCollection('points', list)
    if (!wr.ok) return NextResponse.json({ error: 'write_failed', detail: wr.error ?? '' }, { status: 500 })
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/sessions')
      revalidatePath('/sessions/[id]')
      revalidatePath('/drivers')
      revalidatePath('/championship')
    } catch {}
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
