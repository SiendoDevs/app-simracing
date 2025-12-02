import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { list, put } from '@vercel/blob'
import { loadLocalSessions } from '@/lib/loadLocalSessions'
import { parseSession } from '@/lib/parseSession'
import path from 'node:path'
import fs from 'node:fs'

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
    const adminToken = (process.env.ADMIN_TOKEN || '').trim()
    const headerToken = (req.headers.get('x-admin-token') || '').trim()
    let isAllowed = false
    const devBypass = process.env.DEV_ALLOW_ANON_UPLOAD === '1' || (process.env.NODE_ENV === 'development' && process.env.DEV_ALLOW_ANON_UPLOAD !== '0')
    if (devBypass) isAllowed = true
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
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (token) {
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
    }
    const SESSIONS_DIR = path.resolve(process.cwd(), 'sessions')
    try {
      if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR)
    } catch {}
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const filename = `${yyyy}_${mm}_${dd}_${hh}_${mi}_${ss}.json`
    const target = path.join(SESSIONS_DIR, filename)
    try {
      fs.writeFileSync(target, JSON.stringify(body, null, 2), 'utf-8')
    } catch (e) {
      return NextResponse.json({ error: 'write_failed', detail: String(e) }, { status: 500 })
    }
    return NextResponse.json({ ok: true, pathname: `sessions/${filename}` })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
