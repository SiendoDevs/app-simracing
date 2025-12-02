import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { list, put } from '@vercel/blob'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { parseSession } from '@/lib/parseSession'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      const local = await loadLocalSessions()
      return NextResponse.json(local)
    }
    const res = await list({ prefix: 'sessions/' })
    const files = res.blobs || []
    const sessions = [] as ReturnType<typeof parseSession>[]
    for (const f of files) {
      try {
        const j = await fetch(f.url, { cache: 'no-store' }).then((r) => r.json())
        const s = parseSession(j as Record<string, unknown>, f.pathname)
        sessions.push(s)
      } catch {}
    }
    sessions.sort((a, b) => a.id.localeCompare(b.id))
    return NextResponse.json(sessions)
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) return NextResponse.json({ error: 'blob_not_configured' }, { status: 500 })
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    let isAllowed = false
    if (adminToken && adminToken.length > 0 && adminToken === headerToken) {
      isAllowed = true
    } else {
      try {
        const user = await currentUser()
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
        const isAdmin = !!user && (
          (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
          user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
        )
        if (isAdmin) isAllowed = true
      } catch {}
    }
    if (!isAllowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const filename = `${yyyy}_${mm}_${dd}_${hh}_${mi}.json`
    const key = `sessions/${filename}`
    const blob = await put(key, JSON.stringify(body, null, 2), { access: 'public' })
    return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
