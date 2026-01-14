import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const urlObj = new URL(req.url)
  const server = urlObj.searchParams.get('server') || '2'
  return NextResponse.json(
    { server, playersOnline: null, error: 'live_timing_disabled' },
    { status: 200 },
  )
}
