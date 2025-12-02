import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { list, put } from '@vercel/blob'
// no local fallback
import { parseSession } from '@/lib/parseSession'
import path from 'node:path'
// import fs from 'node:fs'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json([])
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
    const headerName = (req.headers.get('x-filename') || '').trim()
    const baseNameRaw = headerName ? path.basename(headerName) : 'session.json'
    const baseName = baseNameRaw.toLowerCase().endsWith('.json') ? baseNameRaw : `${baseNameRaw}.json`
    if (token) {
      const key = `sessions/${baseName}`
      try {
        const existing = await list({ prefix: 'sessions/' })
        const found = (existing.blobs || []).some((b) => b.pathname === key)
        if (found) return NextResponse.json({ error: 'duplicate', detail: baseName }, { status: 409 })
      } catch {}
      const blob = await put(key, JSON.stringify(body, null, 2), { access: 'public' })
      return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname })
    }
    return NextResponse.json({ error: 'blob_not_configured' }, { status: 500 })
  } catch (e) {
    return NextResponse.json({ error: 'server_error', detail: String(e) }, { status: 500 })
  }
}
