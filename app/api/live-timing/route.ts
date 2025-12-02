import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parsePlayers(html: string): number | null {
  const txt = html.replace(/&nbsp;/gi, ' ')
  const block = txt.match(/Server\s*2[\s\S]{0,400}/i)
  if (block) {
    const m1 = block[0].match(/Players?\s*online\s*[:=]?\s*(\d+)/i)
    if (m1) return Number(m1[1])
    const m2 = block[0].match(/(\d+)\s*(?:players?|jugadores?|conectados?)\b/i)
    if (m2) return Number(m2[1])
    const m3 = block[0].match(/\((\d+)\)/)
    if (m3) return Number(m3[1])
  }
  const patterns = [
    /Players?\s*online\s*[:=]?\s*(\d+)/i,
    /(\d+)\s*(?:players?|jugadores?|conectados?)\b/i,
    /En\s*línea\s*[:=]?\s*(\d+)/i,
    /Online\s*[:=]?\s*(\d+)/i,
  ]
  for (const re of patterns) {
    const m = txt.match(re)
    if (m) return Number(m[1])
  }
  return null
}

export async function GET(req: Request) {
  const urlObj = new URL(req.url)
  const server = urlObj.searchParams.get('server') || '2'
  const target = `http://181.231.189.90:8773/live-timing?server=${encodeURIComponent(server)}`
  try {
    const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'fetch_failed', status: res.status }, { status: 502 })
    const html = await res.text()
    const players = parsePlayers(html)
    return NextResponse.json({ server, playersOnline: typeof players === 'number' ? players : null })
  } catch {
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  }
}
