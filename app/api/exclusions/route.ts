import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { loadExclusions, saveExclusion } from '@/lib/exclusions'

export const runtime = 'nodejs'

export async function GET() {
  const data = loadExclusions()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = !!user && (
      (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
      user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
    )
    if (!isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const body = await req.json()
    if (!body || typeof body.driverId !== 'string' || typeof body.sessionId !== 'string') {
      return NextResponse.json({ error: 'driverId y sessionId requeridos' }, { status: 400 })
    }
    const exclude = !!body.exclude
    saveExclusion({ driverId: body.driverId, sessionId: body.sessionId, exclude })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
