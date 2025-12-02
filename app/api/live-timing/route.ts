import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parsePlayers(html: string): number | null {
  const block = html.match(/(?:Jotracks\s*\/\/\s*Server\s*2|Server\s*2)[\s\S]{0,400}/i)
  if (block) {
    const m = block[0].match(/(\d+)\s+(?:players?|jugadores?)\s+online/i)
    if (m) return Number(m[1])
  }
  const patterns = [
    /(\d+)\s+(?:players?|jugadores?)\s+online/i,
    /Players\s*online:\s*(\d+)/i,
    /(\d+)\s+(?:conectados|conectado)s?/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
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
